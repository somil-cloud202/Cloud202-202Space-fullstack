import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getAllTimeEntries = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      userId: z.number().optional(),
      projectId: z.number().optional(),
      status: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const payload = z.object({ userId: z.number() }).parse(verified);

      // Verify user is admin
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { role: true },
      });

      if (!user || user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can access this resource",
        });
      }

      // Build where clause
      const where: any = {};
      if (input.startDate) {
        where.date = { ...where.date, gte: new Date(input.startDate) };
      }
      if (input.endDate) {
        where.date = { ...where.date, lte: new Date(input.endDate) };
      }
      if (input.userId) {
        where.userId = input.userId;
      }
      if (input.projectId) {
        where.projectId = input.projectId;
      }
      if (input.status) {
        where.status = input.status;
      }

      const timeEntries = await db.timeEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              client: true,
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
          date: "desc",
        },
      });

      return {
        timeEntries,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
