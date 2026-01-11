import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const deleteTask = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      taskId: z.number(),
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

      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins and managers can delete tasks",
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

      await db.task.delete({
        where: { id: input.taskId },
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
        message: "Failed to delete task",
      });
    }
  });
