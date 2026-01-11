import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getMe = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const user = await db.user.findUnique({
        where: { id: parsed.userId },
        include: {
          department: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.status !== "active") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Account is inactive",
        });
      }

      return {
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        personalEmail: user.personalEmail,
        profilePhotoUrl: user.profilePhotoUrl,
        address: user.address,
        emergencyContact: user.emergencyContact,
        role: user.role,
        department: user.department,
        designation: user.designation,
        manager: user.manager,
        employmentType: user.employmentType,
        joinDate: user.joinDate,
        skills: user.skills,
        certifications: user.certifications,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
