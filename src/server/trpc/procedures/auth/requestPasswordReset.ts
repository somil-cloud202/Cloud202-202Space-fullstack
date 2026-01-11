import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import crypto from "crypto";

export const requestPasswordReset = baseProcedure
  .input(
    z.object({
      email: z.string().email(),
    })
  )
  .mutation(async ({ input }) => {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message: "If the email exists, a password reset link has been sent",
      };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing reset token for this user
    await db.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // TODO: In production, send email with reset link
    // For now, we'll return the token for development purposes
    // The reset link would be: ${BASE_URL}/reset-password/${token}
    
    console.log(`Password reset token for ${user.email}: ${token}`);
    console.log(`Reset link: /reset-password/${token}`);

    return {
      success: true,
      message: "If the email exists, a password reset link has been sent",
      // In development, return the token so we can test
      ...(process.env.NODE_ENV === "development" && { token }),
    };
  });
