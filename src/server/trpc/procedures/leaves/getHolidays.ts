import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getHolidays = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      year: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      z.object({ userId: z.number() }).parse(verified);

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
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
