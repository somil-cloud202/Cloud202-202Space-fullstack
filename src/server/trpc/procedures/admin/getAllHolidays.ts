import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getAllHolidays = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      year: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
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
          message: "Only admins can view all holidays",
        });
      }

      const year = input.year || new Date().getFullYear();

      const holidays = await db.holiday.findMany({
        where: {
          year,
        },
        orderBy: {
          date: "asc",
        },
      });

      return {
        holidays,
        year,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch holidays",
      });
    }
  });
