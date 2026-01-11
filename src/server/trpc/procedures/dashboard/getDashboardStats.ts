import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getDashboardStats = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Get current week's hours
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weekTimeEntries = await db.timeEntry.findMany({
        where: {
          userId: parsed.userId,
          date: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
      });

      const hoursThisWeek = weekTimeEntries.reduce(
        (sum, entry) => sum + entry.hours,
        0
      );

      // Get pending timesheet count
      const pendingTimesheets = await db.timeEntry.count({
        where: {
          userId: parsed.userId,
          status: "submitted",
        },
      });

      // Get leave balances
      const currentYear = new Date().getFullYear();
      const leaveBalances = await db.leaveBalance.findMany({
        where: {
          userId: parsed.userId,
          year: currentYear,
        },
        include: {
          leaveType: true,
        },
      });

      // Get pending leave requests
      const pendingLeaveRequests = await db.leaveRequest.count({
        where: {
          userId: parsed.userId,
          status: "pending",
        },
      });

      // Get upcoming holidays
      const upcomingHolidays = await db.holiday.findMany({
        where: {
          date: {
            gte: now,
          },
          year: currentYear,
        },
        orderBy: {
          date: "asc",
        },
        take: 3,
      });

      return {
        hoursThisWeek,
        targetHours: 40,
        pendingTimesheets,
        pendingLeaveRequests,
        leaveBalances,
        upcomingHolidays,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
