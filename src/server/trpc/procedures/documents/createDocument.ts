import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const createDocument = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      name: z.string(),
      fileUrl: z.string(),
      documentType: z.enum(["personal", "company", "tax", "policy"]),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      const document = await db.document.create({
        data: {
          userId: input.documentType === "personal" ? parsed.userId : null,
          documentType: input.documentType,
          name: input.name,
          fileUrl: input.fileUrl,
        },
      });

      return {
        success: true,
        document,
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
