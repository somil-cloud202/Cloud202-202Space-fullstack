import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const createTaskComment = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      taskId: z.number(),
      content: z.string().min(1, "Comment cannot be empty"),
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

      // Verify task exists
      const task = await db.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Create comment
      const comment = await db.taskComment.create({
        data: {
          taskId: input.taskId,
          userId: payload.userId,
          content: input.content,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
        },
      });

      return {
        success: true,
        comment,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create comment",
      });
    }
  });
