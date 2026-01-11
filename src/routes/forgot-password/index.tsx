import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import toast from "react-hot-toast";
import { Mail, ArrowLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/forgot-password/")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [resetToken, setResetToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>();

  const requestResetMutation = useMutation(
    trpc.requestPasswordReset.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        // In development, show the token
        if (data.token) {
          setResetToken(data.token);
        }
      },
    })
  );

  const onSubmit = (data: { email: string }) => {
    requestResetMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <h1 className="text-4xl font-extrabold text-gray-950 tracking-tight">
              202 Space
            </h1>
          </div>
          <p className="text-gray-600">
            Reset your password
          </p>
        </div>

        {/* Forgot Password Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          {!resetToken ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Forgot Password?
              </h2>
              <p className="text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="you@company.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={requestResetMutation.isPending}
                  className="w-full bg-gray-950 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {requestResetMutation.isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <button
                onClick={() => navigate({ to: "/login" })}
                className="w-full mt-4 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h2>
              <p className="text-gray-600 mb-6">
                If the email exists in our system, we've sent a password reset link.
              </p>

              {/* Development only: Show token */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-yellow-800 mb-2">
                  Development Mode
                </p>
                <p className="text-xs text-yellow-700 mb-3">
                  In production, this would be sent via email. For now, use this link:
                </p>
                <button
                  onClick={() => navigate({ to: `/reset-password/${resetToken}` })}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  Go to Reset Password Page
                </button>
              </div>

              <button
                onClick={() => navigate({ to: "/login" })}
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2024 202 Space. All rights reserved.
        </p>
      </div>
    </div>
  );
}
