import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateHoliday = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      holidayId: z.number(),
      name: z.string().min(1),
      date: z.string().datetime(),
      isOptional: z.boolean(),
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
          message: "Only admins can update holidays",
        });
      }

      // Check if holiday exists
      const existingHoliday = await db.holiday.findUnique({
        where: { id: input.holidayId },
      });

      if (!existingHoliday) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Holiday not found",
        });
      }

      const holidayDate = new Date(input.date);
      const year = holidayDate.getFullYear();

      // Check if another holiday exists for this date (excluding current holiday)
      const conflictingHoliday = await db.holiday.findFirst({
        where: {
          date: holidayDate,
          id: { not: input.holidayId },
        },
      });

      if (conflictingHoliday) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Another holiday already exists for this date",
        });
      }

      // Update holiday
      const holiday = await db.holiday.update({
        where: { id: input.holidayId },
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
        message: "Failed to update holiday",
      });
    }
  });
