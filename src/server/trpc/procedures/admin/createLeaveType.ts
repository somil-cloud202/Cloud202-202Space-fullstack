import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const createLeaveType = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      name: z.string().min(1),
      isPaid: z.boolean().default(true),
      requiresApproval: z.boolean().default(true),
      requiresAttachment: z.boolean().default(false),
      defaultAllocated: z.number().min(0),
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
          message: "Only admins can create leave types",
        });
      }

      // Check if leave type already exists
      const existingLeaveType = await db.leaveType.findUnique({
        where: { name: input.name },
      });

      if (existingLeaveType) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Leave type with this name already exists",
        });
      }

      // Create leave type
      const leaveType = await db.leaveType.create({
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
        leaveType,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create leave type",
      });
    }
  });
