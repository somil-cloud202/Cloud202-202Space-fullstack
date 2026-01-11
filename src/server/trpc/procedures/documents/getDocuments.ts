import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const getDocuments = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      documentType: z.enum(["personal", "company", "tax", "policy"]).optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      let whereClause: any = {};

      if (input.documentType === "personal") {
        whereClause = {
          documentType: "personal",
          userId: parsed.userId,
        };
      } else if (input.documentType) {
        whereClause = {
          documentType: input.documentType,
        };
      } else {
        // If no type specified, get user's personal documents
        whereClause = {
          userId: parsed.userId,
        };
      }

      const documents = await db.document.findMany({
        where: whereClause,
        orderBy: {
          uploadedAt: "desc",
        },
      });

      return { documents };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
