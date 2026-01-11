import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { createNotification } from "~/server/utils/notifications";

export const reviewLeaveRequest = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      leaveRequestId: z.number(),
      status: z.enum(["approved", "rejected"]),
      reviewComment: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Get the leave request
      const leaveRequest = await db.leaveRequest.findUnique({
        where: { id: input.leaveRequestId },
        include: {
          user: true,
          leaveType: true,
        },
      });

      if (!leaveRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave request not found",
        });
      }

      // Verify that the authenticated user is the manager of the employee
      if (leaveRequest.user.managerId !== parsed.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to review this leave request",
        });
      }

      // Verify that the leave request is in pending status
      if (leaveRequest.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending leave requests can be reviewed",
        });
      }

      // Calculate days
      const startDate = new Date(leaveRequest.startDate);
      const endDate = new Date(leaveRequest.endDate);
      let days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (leaveRequest.isHalfDay) {
        days = 0.5;
      }

      // Update the leave request and leave balance in a transaction
      await db.$transaction(async (tx) => {
        // Update the leave request
        await tx.leaveRequest.update({
          where: { id: input.leaveRequestId },
          data: {
            status: input.status,
            reviewedBy: parsed.userId,
            reviewedAt: new Date(),
            reviewComment: input.reviewComment,
          },
        });

        // If approved, update the leave balance
        if (input.status === "approved") {
          const currentYear = new Date().getFullYear();
          const leaveBalance = await tx.leaveBalance.findUnique({
            where: {
              userId_year_leaveTypeId: {
                userId: leaveRequest.userId,
                year: currentYear,
                leaveTypeId: leaveRequest.leaveTypeId,
              },
            },
          });

          if (leaveBalance) {
            await tx.leaveBalance.update({
              where: {
                userId_year_leaveTypeId: {
                  userId: leaveRequest.userId,
                  year: currentYear,
                  leaveTypeId: leaveRequest.leaveTypeId,
                },
              },
              data: {
                used: leaveBalance.used + days,
                balance: leaveBalance.balance - days,
              },
            });
          }
        }
      });

      // Send notification to the employee
      await createNotification({
        userId: leaveRequest.userId,
        title: `Leave Request ${input.status === "approved" ? "Approved" : "Rejected"}`,
        message: `Your ${leaveRequest.leaveType.name} request from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} has been ${input.status}.${input.reviewComment ? ` Comment: ${input.reviewComment}` : ""}`,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
