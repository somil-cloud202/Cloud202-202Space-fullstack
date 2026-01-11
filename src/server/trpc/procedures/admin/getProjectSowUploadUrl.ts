import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { minioClient } from "~/server/minio";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { db } from "~/server/db";

export const getProjectSowUploadUrl = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      fileName: z.string(),
      fileType: z.string(),
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
          message: "Only admins can upload project SoW documents",
        });
      }

      const objectName = `sow/${Date.now()}-${input.fileName}`;
      const uploadUrl = await minioClient.presignedPutObject(
        "documents",
        objectName,
        60 * 60 // 1 hour expiry
      );

      return {
        uploadUrl,
        objectName,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
