import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateTimeEntry = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      timeEntryId: z.number(),
      date: z.string().datetime().optional(),
      projectId: z.number().optional(),
      taskId: z.number().optional().nullable(),
      task: z.string().optional(),
      hours: z.number().min(0).max(24).optional(),
      description: z.string().optional(),
      isBillable: z.boolean().optional(),
      status: z.enum(["draft", "submitted"]).optional(),
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
          message: "You can only update your own time entries",
        });
      }

      if (existingEntry.status !== "draft" && existingEntry.status !== "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only update draft or rejected entries",
        });
      }

      const updateData: any = {};
      if (input.date) updateData.date = new Date(input.date);
      if (input.projectId) updateData.projectId = input.projectId;
      if (input.taskId !== undefined) updateData.taskId = input.taskId;
      if (input.task) updateData.task = input.task;
      if (input.hours !== undefined) updateData.hours = input.hours;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isBillable !== undefined) updateData.isBillable = input.isBillable;
      if (input.status) {
        updateData.status = input.status;
        if (input.status === "submitted") {
          updateData.submittedAt = new Date();
        }
      }

      const timeEntry = await db.timeEntry.update({
        where: { id: input.timeEntryId },
        data: updateData,
      });

      return {
        success: true,
        timeEntry,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
