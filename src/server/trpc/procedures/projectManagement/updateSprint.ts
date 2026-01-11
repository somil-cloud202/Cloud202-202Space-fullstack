import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateSprint = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      sprintId: z.number(),
      name: z.string().min(1).optional(),
      goal: z.string().optional().nullable(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      status: z.enum(["planned", "active", "completed"]).optional(),
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
          message: "Only admins and managers can update sprints",
        });
      }

      const sprint = await db.sprint.findUnique({
        where: { id: input.sprintId },
      });

      if (!sprint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sprint not found",
        });
      }

      await db.sprint.update({
        where: { id: input.sprintId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.goal !== undefined && { goal: input.goal }),
          ...(input.startDate && { startDate: new Date(input.startDate) }),
          ...(input.endDate && { endDate: new Date(input.endDate) }),
          ...(input.status && { status: input.status }),
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
        message: "Failed to update sprint",
      });
    }
  });
