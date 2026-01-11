import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { createNotification } from "~/server/utils/notifications";

export const bulkReviewTimeEntries = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      timeEntryIds: z.array(z.number()).min(1),
      status: z.enum(["approved", "rejected"]),
      reviewComment: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      // Verify user is admin
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { role: true },
      });

      if (!user || user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can perform bulk operations",
        });
      }

      // Get all time entries to be updated
      const timeEntries = await db.timeEntry.findMany({
        where: {
          id: { in: input.timeEntryIds },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          project: {
            select: {
              name: true,
            },
          },
        },
      });

      if (timeEntries.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No time entries found with the provided IDs",
        });
      }

      // Update all time entries
      await db.timeEntry.updateMany({
        where: {
          id: { in: input.timeEntryIds },
        },
        data: {
          status: input.status,
          reviewedBy: payload.userId,
          reviewedAt: new Date(),
          reviewComment: input.reviewComment,
        },
      });

      // Create notifications for all affected employees
      // Group by user to avoid duplicate notifications
      const userNotifications = new Map<number, { count: number; projects: string[] }>();
      
      for (const entry of timeEntries) {
        if (!userNotifications.has(entry.userId)) {
          userNotifications.set(entry.userId, { count: 0, projects: [] });
        }
        const userData = userNotifications.get(entry.userId)!;
        userData.count++;
        if (!userData.projects.includes(entry.project.name)) {
          userData.projects.push(entry.project.name);
        }
      }

      // Send consolidated notifications
      for (const [userId, data] of userNotifications.entries()) {
        const projectList = data.projects.length > 3 
          ? `${data.projects.slice(0, 3).join(", ")} and ${data.projects.length - 3} more`
          : data.projects.join(", ");
        
        await createNotification({
          userId,
          title: `${data.count} Timesheet${data.count > 1 ? "s" : ""} ${input.status === "approved" ? "Approved" : "Rejected"}`,
          message: `${data.count} of your timesheet entries for ${projectList} ${data.count > 1 ? "have" : "has"} been ${input.status}.${input.reviewComment ? ` Comment: ${input.reviewComment}` : ""}`,
        });
      }

      return {
        success: true,
        updatedCount: timeEntries.length,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
