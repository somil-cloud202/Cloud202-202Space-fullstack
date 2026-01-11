import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateEmployee = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      userId: z.number(),
      employeeId: z.string().optional(),
      email: z.string().email().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional().nullable(),
      personalEmail: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      emergencyContact: z.string().optional().nullable(),
      departmentId: z.number().optional().nullable(),
      designation: z.string().optional().nullable(),
      managerId: z.number().optional().nullable(),
      role: z.enum(["employee", "manager", "admin"]).optional(),
      employmentType: z.enum(["full-time", "part-time", "contractor"]).optional(),
      skills: z.string().optional().nullable(),
      certifications: z.string().optional().nullable(),
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
          message: "Only admins can update employees",
        });
      }

      // Check if employee exists
      const existingEmployee = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!existingEmployee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      // Check for duplicate email or employeeId if they're being changed
      if (input.email || input.employeeId) {
        const duplicate = await db.user.findFirst({
          where: {
            AND: [
              { id: { not: input.userId } },
              {
                OR: [
                  ...(input.email ? [{ email: input.email }] : []),
                  ...(input.employeeId ? [{ employeeId: input.employeeId }] : []),
                ],
              },
            ],
          },
        });

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email or Employee ID already exists",
          });
        }
      }

      // Build update data object
      const updateData: any = {};
      if (input.employeeId !== undefined) updateData.employeeId = input.employeeId;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.firstName !== undefined) updateData.firstName = input.firstName;
      if (input.lastName !== undefined) updateData.lastName = input.lastName;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.personalEmail !== undefined) updateData.personalEmail = input.personalEmail;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.emergencyContact !== undefined) updateData.emergencyContact = input.emergencyContact;
      if (input.departmentId !== undefined) updateData.departmentId = input.departmentId;
      if (input.designation !== undefined) updateData.designation = input.designation;
      if (input.managerId !== undefined) updateData.managerId = input.managerId;
      if (input.role !== undefined) updateData.role = input.role;
      if (input.employmentType !== undefined) updateData.employmentType = input.employmentType;
      if (input.skills !== undefined) updateData.skills = input.skills;
      if (input.certifications !== undefined) updateData.certifications = input.certifications;

      // Update employee
      const updatedEmployee = await db.user.update({
        where: { id: input.userId },
        data: updateData,
      });

      return {
        success: true,
        employee: updatedEmployee,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update employee",
      });
    }
  });
