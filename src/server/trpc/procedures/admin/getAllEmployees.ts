import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getAllEmployees = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
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

      const employees = await db.user.findMany({
        select: {
          id: true,
          employeeId: true,
          email: true,
          firstName: true,
          lastName: true,
          designation: true,
          role: true,
          status: true,
          departmentId: true,
          managerId: true,
          employmentType: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          firstName: "asc",
        },
      });

      return {
        employees,
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
