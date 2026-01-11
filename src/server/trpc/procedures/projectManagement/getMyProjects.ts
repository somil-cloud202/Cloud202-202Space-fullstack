import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getMyProjects = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
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

      // Admins and managers can see all projects
      if (user.role === "admin" || user.role === "manager") {
        const projects = await db.project.findMany({
          include: {
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeId: true,
                  },
                },
              },
            },
            _count: {
              select: {
                assignments: true,
                timeEntries: true,
                tasks: true,
                sprints: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return { projects };
      }

      // Employees can only see projects they're assigned to
      const projects = await db.project.findMany({
        where: {
          assignments: {
            some: {
              userId: payload.userId,
            },
          },
        },
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeId: true,
                },
              },
            },
          },
          _count: {
            select: {
              assignments: true,
              timeEntries: true,
              tasks: true,
              sprints: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return { projects };
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
