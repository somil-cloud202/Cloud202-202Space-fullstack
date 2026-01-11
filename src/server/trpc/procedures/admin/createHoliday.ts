import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const createHoliday = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      name: z.string().min(1),
      date: z.string().datetime(),
      isOptional: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Verify admin authentication
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      const adminUser = await db.user.findUnique({
        where: { id: payload.userId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create holidays",
        });
      }

      const holidayDate = new Date(input.date);
      const year = holidayDate.getFullYear();

      // Check if holiday already exists for this date
      const existingHoliday = await db.holiday.findFirst({
        where: {
          date: holidayDate,
        },
      });

      if (existingHoliday) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A holiday already exists for this date",
        });
      }

      // Create holiday
      const holiday = await db.holiday.create({
        data: {
          name: input.name,
          date: holidayDate,
          year,
          isOptional: input.isOptional,
        },
      });

      return {
        success: true,
        holiday,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create holiday",
      });
    }
  });
