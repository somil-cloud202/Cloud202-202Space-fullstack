import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const deactivateEmployee = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      userId: z.number(),
      status: z.enum(["active", "inactive"]),
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
          message: "Only admins can change employee status",
        });
      }

      // Check if employee exists
      const employee = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      // Prevent admin from deactivating themselves
      if (input.userId === payload.userId && input.status === "inactive") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate your own account",
        });
      }

      // Update employee status
      const updatedEmployee = await db.user.update({
        where: { id: input.userId },
        data: {
          status: input.status,
          endDate: input.status === "inactive" ? new Date() : null,
        },
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
        message: "Failed to update employee status",
      });
    }
  });
