import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { createNotification } from "~/server/utils/notifications";

export const createTimeEntry = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      date: z.string().datetime(),
      projectId: z.number(),
      taskId: z.number().optional(),
      task: z.string(),
      hours: z.number().min(0).max(24),
      description: z.string().optional(),
      isBillable: z.boolean().default(true),
      status: z.enum(["draft", "submitted"]).default("draft"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Check if project exists
      const project = await db.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check if user is assigned to this project
      const assignment = await db.projectAssignment.findUnique({
        where: {
          userId_projectId: {
            userId: parsed.userId,
            projectId: input.projectId,
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not assigned to this project",
        });
      }

      const timeEntry = await db.timeEntry.create({
        data: {
          userId: parsed.userId,
          date: new Date(input.date),
          projectId: input.projectId,
          taskId: input.taskId,
          task: input.task,
          hours: input.hours,
          description: input.description,
          isBillable: input.isBillable,
          status: input.status,
          submittedAt: input.status === "submitted" ? new Date() : null,
        },
      });

      // If submitted, notify the manager
      if (input.status === "submitted") {
        const user = await db.user.findUnique({
          where: { id: parsed.userId },
          select: {
            managerId: true,
            firstName: true,
            lastName: true,
          },
        });

        if (user?.managerId) {
          await createNotification({
            userId: user.managerId,
            title: "New Timesheet Submitted",
            message: `${user.firstName} ${user.lastName} has submitted a timesheet for ${project.name} (${input.hours}h on ${new Date(input.date).toLocaleDateString()}) for your review.`,
          });
        }
      }

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
