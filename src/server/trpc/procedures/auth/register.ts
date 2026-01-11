import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import bcryptjs from "bcryptjs";

export const register = baseProcedure
  .input(
    z.object({
      employeeId: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string(),
      lastName: z.string(),
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

    const passwordHash = await bcryptjs.hash(input.password, 10);

    const user = await db.user.create({
      data: {
        employeeId: input.employeeId,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        departmentId: input.departmentId,
        designation: input.designation,
        managerId: input.managerId,
        employmentType: input.employmentType,
        joinDate: new Date(input.joinDate),
      },
    });

    // Create leave balances for the new user
    const leaveTypes = await db.leaveType.findMany();
    const currentYear = new Date().getFullYear();

    for (const leaveType of leaveTypes) {
      let allocated = 15; // default
      if (leaveType.name === "Annual Leave") allocated = 18;
      if (leaveType.name === "Sick Leave") allocated = 10;
      if (leaveType.name === "Personal Leave") allocated = 5;
      if (leaveType.name === "Comp Off") allocated = 0;

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
    };
  });
