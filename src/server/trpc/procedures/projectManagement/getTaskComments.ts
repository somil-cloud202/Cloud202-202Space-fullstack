import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getTaskComments = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      taskId: z.number(),
    })
  )
  .query(async ({ input }) => {
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

      const comments = await db.taskComment.findMany({
        where: {
          taskId: input.taskId,
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
        orderBy: {
          createdAt: "asc",
        },
      });

      return {
        comments,
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
