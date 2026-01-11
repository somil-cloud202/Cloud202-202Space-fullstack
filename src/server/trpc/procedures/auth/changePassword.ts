import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";

export const changePassword = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      oldPassword: z.string(),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    })
  )
  .mutation(async ({ input }) => {
    // Verify auth token
    let userId: number;
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);
      userId = parsed.userId;
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcryptjs.compare(
      input.oldPassword,
      user.passwordHash
    );

    if (!isOldPasswordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const newPasswordHash = await bcryptjs.hash(input.newPassword, 10);

    // Update password
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return {
      success: true,
    };
  });
