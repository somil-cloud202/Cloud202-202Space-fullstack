import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const adminUpdateTimeEntry = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      timeEntryId: z.number(),
      date: z.string().datetime().optional(),
      projectId: z.number().optional(),
      task: z.string().optional(),
      hours: z.number().min(0).max(24).optional(),
      description: z.string().optional().nullable(),
      isBillable: z.boolean().optional(),
      status: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),
      reviewComment: z.string().optional().nullable(),
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
          message: "Only admins can update time entries",
        });
      }

      // Check if time entry exists
      const existingEntry = await db.timeEntry.findUnique({
        where: { id: input.timeEntryId },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found",
        });
      }

      // If projectId is being changed, verify it exists
      if (input.projectId) {
        const project = await db.project.findUnique({
          where: { id: input.projectId },
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
      }

      // Build update data object
      const updateData: any = {};
      if (input.date !== undefined) updateData.date = new Date(input.date);
      if (input.projectId !== undefined) updateData.projectId = input.projectId;
      if (input.task !== undefined) updateData.task = input.task;
      if (input.hours !== undefined) updateData.hours = input.hours;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isBillable !== undefined) updateData.isBillable = input.isBillable;
      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status === "submitted" && !existingEntry.submittedAt) {
          updateData.submittedAt = new Date();
        }
        if (input.status === "approved" || input.status === "rejected") {
          updateData.reviewedBy = payload.userId;
          updateData.reviewedAt = new Date();
        }
      }
      if (input.reviewComment !== undefined) updateData.reviewComment = input.reviewComment;

      // Update time entry
      const updatedEntry = await db.timeEntry.update({
        where: { id: input.timeEntryId },
        data: updateData,
      });

      return {
        success: true,
        timeEntry: updatedEntry,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update time entry",
      });
    }
  });
