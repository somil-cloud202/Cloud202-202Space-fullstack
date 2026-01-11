import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getLeaveRequests = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
      year: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const where: any = {
        userId: parsed.userId,
      };

      if (input.status) {
        where.status = input.status;
      }

      if (input.year) {
        const startOfYear = new Date(input.year, 0, 1);
        const endOfYear = new Date(input.year, 11, 31);
        where.startDate = {
          gte: startOfYear,
          lte: endOfYear,
        };
      }

      const leaveRequests = await db.leaveRequest.findMany({
        where,
        include: {
          leaveType: true,
          backupUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        leaveRequests,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
