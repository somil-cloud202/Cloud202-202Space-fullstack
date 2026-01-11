import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const updateProfile = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      phone: z.string().optional(),
      personalEmail: z.string().email().optional(),
      address: z.string().optional(),
      emergencyContact: z.string().optional(),
      skills: z.string().optional(),
      certifications: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const user = await db.user.update({
        where: { id: parsed.userId },
        data: {
          phone: input.phone,
          personalEmail: input.personalEmail,
          address: input.address,
          emergencyContact: input.emergencyContact,
          skills: input.skills,
          certifications: input.certifications,
        },
      });

      return {
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          personalEmail: user.personalEmail,
          address: user.address,
          emergencyContact: user.emergencyContact,
          skills: user.skills,
          certifications: user.certifications,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
