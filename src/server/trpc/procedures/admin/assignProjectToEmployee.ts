import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const assignProjectToEmployee = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      userId: z.number(),
      projectId: z.number(),
      role: z.string().optional(),
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
          message: "Only admins can assign projects",
        });
      }

      // Verify user exists
      const user = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
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

      // Check if assignment already exists
      const existingAssignment = await db.projectAssignment.findUnique({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
      });

      if (existingAssignment) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Employee is already assigned to this project",
        });
      }

      // Create assignment
      const assignment = await db.projectAssignment.create({
        data: {
          userId: input.userId,
          projectId: input.projectId,
          role: input.role,
        },
      });

      return {
        success: true,
        assignmentId: assignment.id,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to assign project to employee",
      });
    }
  });
