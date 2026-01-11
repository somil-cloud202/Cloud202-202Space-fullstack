import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useState } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Paperclip,
} from "lucide-react";

export const Route = createFileRoute("/admin/leaves/")({
  component: AdminLeavesPage,
});

function AdminLeavesPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <AdminLeavesContent />
      </Layout>
    </ProtectedRoute>
  );
}

function AdminLeavesContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<any>(null);

  const leaveTypesQuery = useQuery(
    trpc.getAllLeaveTypes.queryOptions({
      authToken: token!,
    })
  );

  const createMutation = useMutation(
    trpc.createLeaveType.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllLeaveTypes.queryKey(),
        });
        setShowCreateForm(false);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateLeaveType.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllLeaveTypes.queryKey(),
        });
        setEditingLeaveType(null);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteLeaveType.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllLeaveTypes.queryKey(),
        });
      },
    })
  );

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only administrators can access this page.</p>
      </div>
    );
  }

  const handleDelete = (leaveTypeId: number, leaveTypeName: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${leaveTypeName}"? This action cannot be undone and will fail if the leave type is in use.`
      )
    ) {
      toast.promise(
        deleteMutation.mutateAsync({
          authToken: token!,
          leaveTypeId,
        }),
        {
          loading: "Deleting leave type...",
          success: "Leave type deleted successfully!",
          error: (err: any) => err.message || "Failed to delete leave type",
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-950 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Leave Management</h1>
            <p className="text-gray-400 mt-1 text-lg">
              Configure leave types and default quotas
            </p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-4 mt-6 border border-gray-700">
          <p className="text-sm text-gray-400">
            <strong>Note:</strong> Default allocations set here will be automatically
            assigned to new employees when they are onboarded. Existing employees' leave
            balances will not be affected.
          </p>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Leave Type
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <LeaveTypeForm
          onSubmit={(data) => {
            toast.promise(
              createMutation.mutateAsync({
                authToken: token!,
                ...data,
              }),
              {
                loading: "Creating leave type...",
                success: "Leave type created successfully!",
                error: (err: any) => err.message || "Failed to create leave type",
              }
            );
          }}
          onCancel={() => setShowCreateForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Form */}
      {editingLeaveType && (
        <LeaveTypeForm
          initialData={editingLeaveType}
          onSubmit={(data) => {
            toast.promise(
              updateMutation.mutateAsync({
                authToken: token!,
                leaveTypeId: editingLeaveType.id,
                ...data,
              }),
              {
                loading: "Updating leave type...",
                success: "Leave type updated successfully!",
                error: (err: any) => err.message || "Failed to update leave type",
              }
            );
          }}
          onCancel={() => setEditingLeaveType(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Leave Types List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Leave Types</h2>
        </div>

        {leaveTypesQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : leaveTypesQuery.data?.leaveTypes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No leave types configured yet. Create your first leave type to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Quota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Properties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveTypesQuery.data?.leaveTypes.map((leaveType) => (
                  <tr key={leaveType.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                          <Calendar className="w-5 h-5 text-gray-800" />
                        </div>
                        <div className="font-semibold text-gray-900">
                          {leaveType.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-2xl font-bold text-gray-900">
                        {leaveType.defaultAllocated}
                      </div>
                      <div className="text-sm text-gray-500">days/year</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {leaveType.isPaid && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Paid
                          </span>
                        )}
                        {!leaveType.isPaid && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircle className="w-3 h-3" />
                            Unpaid
                          </span>
                        )}
                        {leaveType.requiresApproval && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            <Shield className="w-3 h-3" />
                            Approval Required
                          </span>
                        )}
                        {leaveType.requiresAttachment && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <Paperclip className="w-3 h-3" />
                            Attachment Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {leaveType._count.leaveBalances} employees
                      </div>
                      <div className="text-sm text-gray-500">
                        {leaveType._count.leaveRequests} requests
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingLeaveType(leaveType)}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(leaveType.id, leaveType.name)}
                        className="text-red-600 hover:text-red-900"
                        disabled={
                          leaveType._count.leaveBalances > 0 ||
                          leaveType._count.leaveRequests > 0
                        }
                        title={
                          leaveType._count.leaveBalances > 0 ||
                          leaveType._count.leaveRequests > 0
                            ? "Cannot delete leave type that is in use"
                            : "Delete leave type"
                        }
                      >
                        <Trash2
                          className={`w-5 h-5 ${
                            leaveType._count.leaveBalances > 0 ||
                            leaveType._count.leaveRequests > 0
                              ? "opacity-30 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaveTypeForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: initialData || {
      name: "",
      isPaid: true,
      requiresApproval: true,
      requiresAttachment: false,
      defaultAllocated: 0,
    },
  });

  const onFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      defaultAllocated: parseFloat(data.defaultAllocated),
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {initialData ? "Edit Leave Type" : "Create Leave Type"}
      </h3>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leave Type Name
          </label>
          <input
            type="text"
            {...register("name", {
              required: "Leave type name is required",
            })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="e.g., Annual Leave, Sick Leave"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Allocation (days per year)
          </label>
          <input
            type="number"
            step="0.5"
            {...register("defaultAllocated", {
              required: "Default allocation is required",
              min: { value: 0, message: "Must be 0 or greater" },
            })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="e.g., 18"
          />
          {errors.defaultAllocated && (
            <p className="mt-1 text-sm text-red-600">
              {errors.defaultAllocated.message}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            This amount will be automatically assigned to new employees
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPaid"
              {...register("isPaid")}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <label htmlFor="isPaid" className="text-sm font-medium text-gray-700">
              Paid Leave
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresApproval"
              {...register("requiresApproval")}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <label
              htmlFor="requiresApproval"
              className="text-sm font-medium text-gray-700"
            >
              Requires Manager Approval
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresAttachment"
              {...register("requiresAttachment")}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <label
              htmlFor="requiresAttachment"
              className="text-sm font-medium text-gray-700"
            >
              Requires Supporting Document
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading
              ? "Saving..."
              : initialData
                ? "Update Leave Type"
                : "Create Leave Type"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
