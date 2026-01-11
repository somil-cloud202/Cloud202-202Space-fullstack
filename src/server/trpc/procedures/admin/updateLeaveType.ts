import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateLeaveType = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      leaveTypeId: z.number(),
      name: z.string().min(1).optional(),
      isPaid: z.boolean().optional(),
      requiresApproval: z.boolean().optional(),
      requiresAttachment: z.boolean().optional(),
      defaultAllocated: z.number().min(0).optional(),
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
          message: "Only admins can update leave types",
        });
      }

      // Check if leave type exists
      const leaveType = await db.leaveType.findUnique({
        where: { id: input.leaveTypeId },
      });

      if (!leaveType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave type not found",
        });
      }

      // If name is being changed, check for conflicts
      if (input.name && input.name !== leaveType.name) {
        const existingLeaveType = await db.leaveType.findUnique({
          where: { name: input.name },
        });

        if (existingLeaveType) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Leave type with this name already exists",
          });
        }
      }

      // Update leave type
      const updatedLeaveType = await db.leaveType.update({
        where: { id: input.leaveTypeId },
        data: {
          name: input.name,
          isPaid: input.isPaid,
          requiresApproval: input.requiresApproval,
          requiresAttachment: input.requiresAttachment,
          defaultAllocated: input.defaultAllocated,
        },
      });

      return {
        success: true,
        leaveType: updatedLeaveType,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update leave type",
      });
    }
  });
