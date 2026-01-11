import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getProjects = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      z.object({ userId: z.number() }).parse(verified);

      const projects = await db.project.findMany({
        where: {
          status: "active",
          assignments: {
            some: {
              userId: (verified as { userId: number }).userId,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return {
        projects,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
