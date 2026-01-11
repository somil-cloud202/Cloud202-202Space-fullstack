import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { createNotification } from "~/server/utils/notifications";

export const createLeaveRequest = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      leaveTypeId: z.number(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      isHalfDay: z.boolean().default(false),
      halfDayPeriod: z.enum(["AM", "PM"]).optional(),
      reason: z.string(),
      attachmentUrl: z.string().optional(),
      backupUserId: z.number().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

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

      // Calculate days (simplified - doesn't account for weekends/holidays)
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      let days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (input.isHalfDay) {
        days = 0.5;
      }

      // Check leave balance
      const currentYear = new Date().getFullYear();
      const leaveBalance = await db.leaveBalance.findUnique({
        where: {
          userId_year_leaveTypeId: {
            userId: parsed.userId,
            year: currentYear,
            leaveTypeId: input.leaveTypeId,
          },
        },
      });

      if (!leaveBalance || leaveBalance.balance < days) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient leave balance",
        });
      }

      const leaveRequest = await db.leaveRequest.create({
        data: {
          userId: parsed.userId,
          leaveTypeId: input.leaveTypeId,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          isHalfDay: input.isHalfDay,
          halfDayPeriod: input.halfDayPeriod,
          reason: input.reason,
          attachmentUrl: input.attachmentUrl,
          backupUserId: input.backupUserId,
        },
      });

      // Notify the manager
      const user = await db.user.findUnique({
        where: { id: parsed.userId },
        select: {
          managerId: true,
          firstName: true,
          lastName: true,
        },
      });

      // Get backup user info if provided
      let backupUserInfo = null;
      if (input.backupUserId) {
        backupUserInfo = await db.user.findUnique({
          where: { id: input.backupUserId },
          select: {
            firstName: true,
            lastName: true,
          },
        });
      }

      const backupText = backupUserInfo
        ? ` Backup: ${backupUserInfo.firstName} ${backupUserInfo.lastName}.`
        : "";

      if (user?.managerId) {
        await createNotification({
          userId: user.managerId,
          title: "New Leave Request",
          message: `${user.firstName} ${user.lastName} has requested ${leaveType.name} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} for your review.${backupText}`,
        });
      }

      // Notify the backup user if assigned
      if (input.backupUserId && backupUserInfo) {
        await createNotification({
          userId: input.backupUserId,
          title: "Backup Assignment",
          message: `You have been assigned as backup for ${user?.firstName} ${user?.lastName} during their ${leaveType.name} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.`,
        });
      }

      return {
        success: true,
        leaveRequest,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
