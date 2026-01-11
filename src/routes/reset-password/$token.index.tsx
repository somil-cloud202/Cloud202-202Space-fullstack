import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import toast from "react-hot-toast";
import { Lock, CheckCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/reset-password/$token/")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [resetSuccess, setResetSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<{ newPassword: string; confirmPassword: string }>();

  const resetPasswordMutation = useMutation(
    trpc.resetPassword.mutationOptions({
      onSuccess: () => {
        setResetSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => {
          navigate({ to: "/login" });
        }, 2000);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reset password");
      },
    })
  );

  const newPassword = watch("newPassword");

  const onSubmit = (data: { newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    resetPasswordMutation.mutate({
      token,
      newPassword: data.newPassword,
    });
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
            Create your new password
          </p>
        </div>

        {/* Reset Password Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          {!resetSuccess ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Reset Password
              </h2>
              <p className="text-gray-600 mb-6">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    {...register("newPassword", {
                      required: "New password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                    })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Enter new password"
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword", {
                      required: "Please confirm your new password",
                      validate: (value) =>
                        value === newPassword || "Passwords do not match",
                    })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Confirm new password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="w-full bg-gray-950 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {resetPasswordMutation.isPending ? (
                    "Resetting Password..."
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Password Reset Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                Your password has been reset successfully. Redirecting to login...
              </p>
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
