import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { minioClient, getBucketName } from "~/server/minio";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getUploadUrl = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      fileName: z.string(),
      fileType: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const bucketName = getBucketName("profile-photos");
      const objectName = `${parsed.userId}-${Date.now()}-${input.fileName}`;
      const uploadUrl = await minioClient.presignedPutObject(
        bucketName,
        objectName,
        60 * 60 // 1 hour expiry
      );

      return {
        uploadUrl,
        objectName,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
