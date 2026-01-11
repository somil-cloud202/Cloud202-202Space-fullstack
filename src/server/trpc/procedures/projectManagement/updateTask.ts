import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateTask = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      taskId: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      status: z.enum(["todo", "in-progress", "done"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      assignedToId: z.number().optional().nullable(),
      estimatedHours: z.number().positive().optional().nullable(),
      sprintId: z.number().optional().nullable(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      const user = await db.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      const task = await db.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      await db.task.update({
        where: { id: input.taskId },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.status && { status: input.status }),
          ...(input.priority && { priority: input.priority }),
          ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
          ...(input.estimatedHours !== undefined && { estimatedHours: input.estimatedHours }),
          ...(input.sprintId !== undefined && { sprintId: input.sprintId }),
        },
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
        message: "Failed to update task",
      });
    }
  });
