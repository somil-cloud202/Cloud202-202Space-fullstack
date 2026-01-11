import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getEmployeeById = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      employeeId: z.number(),
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

      const employee = await db.user.findUnique({
        where: { id: input.employeeId },
        select: {
          id: true,
          employeeId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          personalEmail: true,
          address: true,
          emergencyContact: true,
          departmentId: true,
          designation: true,
          managerId: true,
          role: true,
          employmentType: true,
          status: true,
          skills: true,
          certifications: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      return {
        employee,
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
