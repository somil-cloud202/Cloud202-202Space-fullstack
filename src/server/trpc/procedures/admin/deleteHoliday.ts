import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const deleteHoliday = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      holidayId: z.number(),
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
          message: "Only admins can delete holidays",
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

      // Delete holiday
      await db.holiday.delete({
        where: { id: input.holidayId },
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete holiday",
      });
    }
  });
