import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { createNotification } from "~/server/utils/notifications";

export const reviewTimesheet = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      timeEntryId: z.number(),
      status: z.enum(["approved", "rejected"]),
      reviewComment: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Get the timesheet entry
      const timeEntry = await db.timeEntry.findUnique({
        where: { id: input.timeEntryId },
        include: {
          user: true,
          project: true,
        },
      });

      if (!timeEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet entry not found",
        });
      }

      // Verify that the authenticated user is the manager of the employee
      if (timeEntry.user.managerId !== parsed.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to review this timesheet",
        });
      }

      // Verify that the timesheet is in submitted status
      if (timeEntry.status !== "submitted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only submitted timesheets can be reviewed",
        });
      }

      // Update the timesheet
      const updatedEntry = await db.timeEntry.update({
        where: { id: input.timeEntryId },
        data: {
          status: input.status,
          reviewedBy: parsed.userId,
          reviewedAt: new Date(),
          reviewComment: input.reviewComment,
        },
      });

      // Send notification to the employee
      await createNotification({
        userId: timeEntry.userId,
        title: `Timesheet ${input.status === "approved" ? "Approved" : "Rejected"}`,
        message: `Your timesheet for ${timeEntry.project.name} (${timeEntry.hours}h on ${new Date(timeEntry.date).toLocaleDateString()}) has been ${input.status}.${input.reviewComment ? ` Comment: ${input.reviewComment}` : ""}`,
      });

      return {
        success: true,
        timeEntry: updatedEntry,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
