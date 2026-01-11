import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getTimeEntries = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      status: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const where: any = {
        userId: parsed.userId,
      };

      if (input.startDate && input.endDate) {
        where.date = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate),
        };
      }

      if (input.status) {
        where.status = input.status;
      }

      const timeEntries = await db.timeEntry.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              client: true,
            },
          },
          taskRecord: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      return {
        timeEntries,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
