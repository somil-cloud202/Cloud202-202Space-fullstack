import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const createProject = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      name: z.string().min(1),
      client: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      budgetHours: z.number().positive().optional(),
      status: z.enum(["active", "completed", "on-hold"]).default("active"),
      customerEmail: z.string().email().optional(),
      customerPhone: z.string().optional(),
      sowFileUrl: z.string().optional(),
      awsAccountNumber: z.string().optional(),
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
          message: "Only admins can create projects",
        });
      }

      // Create project
      const project = await db.project.create({
        data: {
          name: input.name,
          client: input.client,
          description: input.description,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          budgetHours: input.budgetHours,
          status: input.status,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          sowFileUrl: input.sowFileUrl,
          awsAccountNumber: input.awsAccountNumber,
        },
      });

      return {
        success: true,
        projectId: project.id,
        projectName: project.name,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create project",
      });
    }
  });
