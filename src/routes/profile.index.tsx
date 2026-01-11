import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Building,
  Camera,
  Save,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <ProtectedRoute>
      <Layout>
        <ProfileContent />
      </Layout>
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const userQuery = useQuery(
    trpc.getMe.queryOptions({
      authToken: token!,
    })
  );

  const updateProfileMutation = useMutation(
    trpc.updateProfile.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.getMe.queryKey() });
        setIsEditing(false);
      },
    })
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    values: {
      phone: userQuery.data?.phone || "",
      personalEmail: userQuery.data?.personalEmail || "",
      address: userQuery.data?.address || "",
      emergencyContact: userQuery.data?.emergencyContact || "",
      skills: userQuery.data?.skills || "",
      certifications: userQuery.data?.certifications || "",
    },
  });

  const onSubmit = (data: any) => {
    toast.promise(
      updateProfileMutation.mutateAsync({
        authToken: token!,
        ...data,
      }),
      {
        loading: "Updating profile...",
        success: "Profile updated successfully!",
        error: "Failed to update profile",
      }
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      // Get upload URL
      const uploadData = await trpcClient.getUploadUrl.query({
        authToken: token!,
        fileName: file.name,
        fileType: file.type,
      });

      // Upload to MinIO
      await fetch(uploadData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      // Update profile photo URL
      await trpcClient.updateProfilePhoto.mutate({
        authToken: token!,
        objectName: uploadData.objectName,
      });

      queryClient.invalidateQueries({ queryKey: trpc.getMe.queryKey() });
      toast.success("Profile photo updated!");
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const user = userQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center text-white text-4xl font-bold">
                {user?.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-gray-950 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                <Camera className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-gray-600 mb-2">{user?.designation}</p>
            <p className="text-sm text-gray-500">{user?.department?.name}</p>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">Employee ID</div>
              <div className="font-semibold text-gray-900">
                {user?.employeeId}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employment Details (Read-only) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Employment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem
                icon={Mail}
                label="Official Email"
                value={user?.email}
              />
              <InfoItem
                icon={Briefcase}
                label="Designation"
                value={user?.designation}
              />
              <InfoItem
                icon={Building}
                label="Department"
                value={user?.department?.name}
              />
              <InfoItem
                icon={Calendar}
                label="Date of Joining"
                value={
                  user?.joinDate
                    ? new Date(user.joinDate).toLocaleDateString()
                    : ""
                }
              />
              <InfoItem
                icon={User}
                label="Employment Type"
                value={user?.employmentType}
              />
              <InfoItem
                icon={User}
                label="Reporting Manager"
                value={
                  user?.manager
                    ? `${user.manager.firstName} ${user.manager.lastName}`
                    : "N/A"
                }
              />
            </div>
          </div>

          {/* Personal Information (Editable) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Personal Information
            </h3>
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...register("phone")}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    {...register("personalEmail")}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    {...register("address")}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    {...register("emergencyContact")}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skills
                  </label>
                  <textarea
                    {...register("skills")}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="e.g., React, Node.js, Python"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certifications
                  </label>
                  <textarea
                    {...register("certifications")}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="e.g., AWS Certified, PMP"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem icon={Phone} label="Phone" value={user?.phone} />
                <InfoItem
                  icon={Mail}
                  label="Personal Email"
                  value={user?.personalEmail}
                />
                <InfoItem
                  icon={MapPin}
                  label="Address"
                  value={user?.address}
                  className="md:col-span-2"
                />
                <InfoItem
                  icon={User}
                  label="Emergency Contact"
                  value={user?.emergencyContact}
                  className="md:col-span-2"
                />
                <InfoItem
                  icon={Briefcase}
                  label="Skills"
                  value={user?.skills}
                  className="md:col-span-2"
                />
                <InfoItem
                  icon={Briefcase}
                  label="Certifications"
                  value={user?.certifications}
                  className="md:col-span-2"
                />
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Change Password
            </h3>
            <ChangePasswordForm token={token!} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: any;
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gray-800" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="font-medium text-gray-900 break-words">
          {value || "Not provided"}
        </div>
      </div>
    </div>
  );
}

function ChangePasswordForm({ token }: { token: string }) {
  const trpc = useTRPC();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<{
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  const changePasswordMutation = useMutation(
    trpc.changePassword.mutationOptions({
      onSuccess: () => {
        reset();
      },
    })
  );

  const newPassword = watch("newPassword");

  const onSubmit = (data: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    toast.promise(
      changePasswordMutation.mutateAsync({
        authToken: token,
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      }),
      {
        loading: "Changing password...",
        success: "Password changed successfully!",
        error: (err) => err.message || "Failed to change password",
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Current Password
        </label>
        <input
          type="password"
          {...register("oldPassword", {
            required: "Current password is required",
          })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Enter current password"
        />
        {errors.oldPassword && (
          <p className="mt-1 text-sm text-red-600">
            {errors.oldPassword.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          New Password
        </label>
        <input
          type="password"
          {...register("newPassword", {
            required: "New password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Enter new password"
        />
        {errors.newPassword && (
          <p className="mt-1 text-sm text-red-600">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirm New Password
        </label>
        <input
          type="password"
          {...register("confirmPassword", {
            required: "Please confirm your new password",
            validate: (value) =>
              value === newPassword || "Passwords do not match",
          })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
        disabled={changePasswordMutation.isPending}
        className="w-full px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Lock className="w-5 h-5" />
        {changePasswordMutation.isPending
          ? "Changing Password..."
          : "Change Password"}
      </button>
    </form>
  );
}
