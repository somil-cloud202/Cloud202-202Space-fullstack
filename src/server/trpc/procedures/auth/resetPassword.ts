import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import bcryptjs from "bcryptjs";

export const resetPassword = baseProcedure
  .input(
    z.object({
      token: z.string(),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    })
  )
  .mutation(async ({ input }) => {
    // Find the reset token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token: input.token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid or expired reset token",
      });
    }

    // Check if token has expired
    if (resetToken.expiresAt < new Date()) {
      // Delete expired token
      await db.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Reset token has expired. Please request a new one.",
      });
    }

    // Hash new password
    const newPasswordHash = await bcryptjs.hash(input.newPassword, 10);

    // Update user password
    await db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Delete the used token
    await db.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return {
      success: true,
      message: "Password has been reset successfully",
    };
  });
