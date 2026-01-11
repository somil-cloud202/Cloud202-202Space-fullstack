import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const createSprint = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      projectId: z.number(),
      name: z.string().min(1),
      goal: z.string().optional(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      status: z.enum(["planned", "active", "completed"]).default("planned"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Verify authentication
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { role: true },
      });

      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins and managers can create sprints",
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

      // Create sprint
      const sprint = await db.sprint.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          goal: input.goal,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: input.status,
        },
      });

      return {
        success: true,
        sprintId: sprint.id,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create sprint",
      });
    }
  });
