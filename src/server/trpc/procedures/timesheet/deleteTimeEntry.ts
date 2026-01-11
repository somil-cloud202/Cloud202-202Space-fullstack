import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const deleteTimeEntry = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      timeEntryId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const existingEntry = await db.timeEntry.findUnique({
        where: { id: input.timeEntryId },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found",
        });
      }

      if (existingEntry.userId !== parsed.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own time entries",
        });
      }

      if (existingEntry.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only delete draft entries",
        });
      }

      await db.timeEntry.delete({
        where: { id: input.timeEntryId },
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
