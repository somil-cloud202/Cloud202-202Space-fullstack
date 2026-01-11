import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const deleteEmployee = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      userId: z.number(),
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
          message: "Only admins can delete employees",
        });
      }

      // Check if employee exists
      const employee = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      // Prevent admin from deleting themselves
      if (input.userId === payload.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      // Delete all related records manually to ensure clean deletion
      // Delete notifications
      await db.notification.deleteMany({
        where: { userId: input.userId },
      });

      // Delete documents
      await db.document.deleteMany({
        where: { userId: input.userId },
      });

      // Delete payslips
      await db.payslip.deleteMany({
        where: { userId: input.userId },
      });

      // Delete leave requests (both created by and reviewed by)
      await db.leaveRequest.deleteMany({
        where: { userId: input.userId },
      });

      // Update leave requests where this user was the reviewer
      await db.leaveRequest.updateMany({
        where: { reviewedBy: input.userId },
        data: { reviewedBy: null },
      });

      // Delete leave balances
      await db.leaveBalance.deleteMany({
        where: { userId: input.userId },
      });

      // Delete time entries (both created by and reviewed by)
      await db.timeEntry.deleteMany({
        where: { userId: input.userId },
      });

      // Update time entries where this user was the reviewer
      await db.timeEntry.updateMany({
        where: { reviewedBy: input.userId },
        data: { reviewedBy: null },
      });

      // Delete project assignments
      await db.projectAssignment.deleteMany({
        where: { userId: input.userId },
      });

      // Update employees who report to this user (set managerId to null)
      await db.user.updateMany({
        where: { managerId: input.userId },
        data: { managerId: null },
      });

      // Finally, delete the user
      await db.user.delete({
        where: { id: input.userId },
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
        message: "Failed to delete employee",
      });
    }
  });
