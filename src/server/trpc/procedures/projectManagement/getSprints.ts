import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getSprints = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      projectId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      // Verify user exists
      const user = await db.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      const sprints = await db.sprint.findMany({
        where: {
          projectId: input.projectId,
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          startDate: "desc",
        },
      });

      return {
        sprints,
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
