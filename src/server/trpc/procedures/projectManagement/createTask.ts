import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const createTask = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      projectId: z.number(),
      sprintId: z.number().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.enum(["todo", "in-progress", "done"]).default("todo"),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      assignedToId: z.number().optional(),
      estimatedHours: z.number().positive().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      // Verify project exists
      const project = await db.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Create task
      const task = await db.task.create({
        data: {
          projectId: input.projectId,
          sprintId: input.sprintId,
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          assignedToId: input.assignedToId,
          estimatedHours: input.estimatedHours,
        },
      });

      return {
        success: true,
        taskId: task.id,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create task",
      });
    }
  });
