import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getEmployeesForBackup = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      // Get all active employees except the current user
      const employees = await db.user.findMany({
        where: {
          status: "active",
          id: {
            not: parsed.userId, // Exclude current user
          },
        },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          designation: true,
          department: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          {
            firstName: "asc",
          },
          {
            lastName: "asc",
          },
        ],
      });

      return {
        employees,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
