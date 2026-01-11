import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const markAsRead = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      notificationId: z.number().optional(),
      markAll: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);

      if (input.markAll) {
        await db.notification.updateMany({
          where: {
            userId: parsed.userId,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });
      } else if (input.notificationId) {
        await db.notification.updateMany({
          where: {
            id: input.notificationId,
            userId: parsed.userId,
          },
          data: {
            isRead: true,
          },
        });
      }

      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  });
