import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { minioClient } from "~/server/minio";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getDownloadUrl = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      bucket: z.string(),
      objectName: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      jwt.verify(input.authToken, env.JWT_SECRET);

      const downloadUrl = await minioClient.presignedGetObject(
        input.bucket,
        input.objectName,
        60 * 60 // 1 hour expiry
      );

      return { downloadUrl };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
