import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const onboardEmployee = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      employeeId: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string(),
      lastName: z.string(),
      phone: z.string().optional(),
      departmentId: z.number().optional(),
      designation: z.string().optional(),
      managerId: z.number().optional(),
      role: z.enum(["employee", "manager", "admin"]).default("employee"),
      employmentType: z
        .enum(["full-time", "part-time", "contractor"])
        .default("full-time"),
      joinDate: z.string().datetime(),
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
          message: "Only admins can onboard employees",
        });
      }

      // Check if email or employee ID already exists
      const existingUser = await db.user.findFirst({
        where: {
          OR: [{ email: input.email }, { employeeId: input.employeeId }],
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email or Employee ID already exists",
        });
      }

      // Hash password
      const passwordHash = await bcryptjs.hash(input.password, 10);

      // Create user
      const user = await db.user.create({
        data: {
          employeeId: input.employeeId,
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: input.role,
          departmentId: input.departmentId,
          designation: input.designation,
          managerId: input.managerId,
          employmentType: input.employmentType,
          joinDate: new Date(input.joinDate),
          status: "active", // Explicitly set status to active
        },
      });

      // Create leave balances for the new user
      const leaveTypes = await db.leaveType.findMany();
      const currentYear = new Date().getFullYear();

      for (const leaveType of leaveTypes) {
        // Use the defaultAllocated from the leave type configuration
        const allocated = leaveType.defaultAllocated || 0;

        await db.leaveBalance.create({
          data: {
            userId: user.id,
            year: currentYear,
            leaveTypeId: leaveType.id,
            allocated,
            used: 0,
            balance: allocated,
          },
        });
      }

      return {
        success: true,
        userId: user.id,
        employeeId: user.employeeId,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to onboard employee",
      });
    }
  });
