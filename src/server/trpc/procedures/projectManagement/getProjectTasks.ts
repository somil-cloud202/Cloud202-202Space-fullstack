import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getProjectTasks = baseProcedure
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

      // Check if user has access to this project
      if (user.role !== "admin" && user.role !== "manager") {
        const assignment = await db.projectAssignment.findFirst({
          where: {
            userId: payload.userId,
            projectId: input.projectId,
          },
        });

        if (!assignment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }
      }

      const tasks = await db.task.findMany({
        where: {
          projectId: input.projectId,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
          sprint: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return { tasks };
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
