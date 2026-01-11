import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getLeaveBalances = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      year: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const year = input.year || new Date().getFullYear();

      const leaveBalances = await db.leaveBalance.findMany({
        where: {
          userId: parsed.userId,
          year,
        },
        include: {
          leaveType: true,
        },
        orderBy: {
          leaveType: {
            name: "asc",
          },
        },
      });

      return {
        leaveBalances,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
