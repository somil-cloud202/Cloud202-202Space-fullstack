import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getPendingLeaveRequests = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Get the manager's user record to verify role
      const manager = await db.user.findUnique({
        where: { id: parsed.userId },
      });

      if (!manager || (manager.role !== "manager" && manager.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only managers can access this resource",
        });
      }

      let whereClause: any = {
        status: "pending",
      };

      if (manager.role === "admin") {
        // Admins can see all pending leave requests
        whereClause = {
          status: "pending",
        };
      } else if (manager.role === "manager") {
        // Managers can only see requests from their direct reports
        whereClause = {
          status: "pending",
          user: {
            managerId: parsed.userId,
          },
        };
      }

      const leaveRequests = await db.leaveRequest.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              designation: true,
            },
          },
          leaveType: {
            select: {
              id: true,
              name: true,
              isPaid: true,
            },
          },
          backupUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return { leaveRequests };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
