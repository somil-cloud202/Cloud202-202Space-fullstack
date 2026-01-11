import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const adminDeleteTimeEntry = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      timeEntryId: z.number(),
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
          message: "Only admins can delete time entries",
        });
      }

      // Check if time entry exists
      const timeEntry = await db.timeEntry.findUnique({
        where: { id: input.timeEntryId },
      });

      if (!timeEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found",
        });
      }

      // Delete time entry (admin can delete any entry regardless of status)
      await db.timeEntry.delete({
        where: { id: input.timeEntryId },
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
        message: "Failed to delete time entry",
      });
    }
  });
