import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { minioBaseUrl } from "~/server/minio";

export const updateProfilePhoto = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      objectName: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const profilePhotoUrl = `${minioBaseUrl}/profile-photos/${input.objectName}`;

      const user = await db.user.update({
        where: { id: parsed.userId },
        data: {
          profilePhotoUrl,
        },
      });

      return {
        success: true,
        profilePhotoUrl: user.profilePhotoUrl,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
