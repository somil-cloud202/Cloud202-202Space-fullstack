import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateProject = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      projectId: z.number(),
      name: z.string().min(1).optional(),
      client: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      startDate: z.string().datetime().optional().nullable(),
      endDate: z.string().datetime().optional().nullable(),
      budgetHours: z.number().positive().optional().nullable(),
      status: z.enum(["active", "completed", "on-hold"]).optional(),
      customerEmail: z.string().email().optional().nullable(),
      customerPhone: z.string().optional().nullable(),
      sowFileUrl: z.string().optional().nullable(),
      awsAccountNumber: z.string().optional().nullable(),
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
          message: "Only admins can update projects",
        });
      }

      // Check if project exists
      const existingProject = await db.project.findUnique({
        where: { id: input.projectId },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Build update data object
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.client !== undefined) updateData.client = input.client;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.startDate !== undefined) {
        updateData.startDate = input.startDate ? new Date(input.startDate) : null;
      }
      if (input.endDate !== undefined) {
        updateData.endDate = input.endDate ? new Date(input.endDate) : null;
      }
      if (input.budgetHours !== undefined) updateData.budgetHours = input.budgetHours;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.customerEmail !== undefined) updateData.customerEmail = input.customerEmail;
      if (input.customerPhone !== undefined) updateData.customerPhone = input.customerPhone;
      if (input.sowFileUrl !== undefined) updateData.sowFileUrl = input.sowFileUrl;
      if (input.awsAccountNumber !== undefined) updateData.awsAccountNumber = input.awsAccountNumber;

      // Update project
      const updatedProject = await db.project.update({
        where: { id: input.projectId },
        data: updateData,
      });

      return {
        success: true,
        project: updatedProject,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update project",
      });
    }
  });
