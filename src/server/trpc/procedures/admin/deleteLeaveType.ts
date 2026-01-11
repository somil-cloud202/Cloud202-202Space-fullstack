import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const deleteLeaveType = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      leaveTypeId: z.number(),
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
          message: "Only admins can delete leave types",
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

      // Check if leave type is in use
      const leaveBalancesCount = await db.leaveBalance.count({
        where: { leaveTypeId: input.leaveTypeId },
      });

      const leaveRequestsCount = await db.leaveRequest.count({
        where: { leaveTypeId: input.leaveTypeId },
      });

      if (leaveBalancesCount > 0 || leaveRequestsCount > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete leave type that is in use. Consider deactivating it instead.",
        });
      }

      // Delete leave type
      await db.leaveType.delete({
        where: { id: input.leaveTypeId },
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
        message: "Failed to delete leave type",
      });
    }
  });
