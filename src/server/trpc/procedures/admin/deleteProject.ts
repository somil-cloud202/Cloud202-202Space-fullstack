import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const deleteProject = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      projectId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Verify admin authentication
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      const adminUser = await db.user.findUnique({
        where: { id: payload.userId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete projects",
        });
      }

      // Check if project exists
      const project = await db.project.findUnique({
        where: { id: input.projectId },
        include: {
          _count: {
            select: {
              timeEntries: true,
              assignments: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check for dependencies
      if (project._count.timeEntries > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete project with ${project._count.timeEntries} time entries. Please archive it by setting status to 'completed' instead.`,
        });
      }

      // Delete project assignments first
      await db.projectAssignment.deleteMany({
        where: { projectId: input.projectId },
      });

      // Delete project
      await db.project.delete({
        where: { id: input.projectId },
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
        message: "Failed to delete project",
      });
    }
  });
