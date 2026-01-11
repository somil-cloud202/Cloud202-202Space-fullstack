import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { Clock, Shield, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/admin/tasks/$timeEntryId/edit")({
  component: EditTimeEntryPage,
});

type EditTimeEntryFormData = {
  date: string;
  projectId: number;
  task: string;
  hours: number;
  description?: string;
  isBillable: boolean;
  status: "draft" | "submitted" | "approved" | "rejected";
  reviewComment?: string;
};

function EditTimeEntryPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <EditTimeEntryContent />
      </Layout>
    </ProtectedRoute>
  );
}

function EditTimeEntryContent() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { timeEntryId } = Route.useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const timeEntriesQuery = useQuery(
    trpc.getAllTimeEntries.queryOptions({
      authToken: token!,
    })
  );

  const projectsQuery = useQuery(
    trpc.getProjects.queryOptions({
      authToken: token!,
    })
  );

  const updateMutation = useMutation(
    trpc.adminUpdateTimeEntry.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllTimeEntries.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getTimeEntries.queryKey(),
        });
        toast.success("Time entry updated successfully!");
        navigate({ to: "/admin/tasks" });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update time entry");
      },
    })
  );

  const timeEntry = timeEntriesQuery.data?.timeEntries.find(
    (e) => e.id === parseInt(timeEntryId)
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EditTimeEntryFormData>({
    values: timeEntry
      ? {
          date: new Date(timeEntry.date).toISOString().split("T")[0],
          projectId: timeEntry.projectId,
          task: timeEntry.task,
          hours: timeEntry.hours,
          description: timeEntry.description || "",
          isBillable: timeEntry.isBillable,
          status: timeEntry.status as any,
          reviewComment: timeEntry.reviewComment || "",
        }
      : undefined,
  });

  const selectedStatus = watch("status");

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

  if (timeEntriesQuery.isLoading || projectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!timeEntry) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Time Entry Not Found</h2>
        <p className="text-gray-600 mb-4">The time entry you're looking for doesn't exist.</p>
        <Link
          to="/admin/tasks"
          className="text-gray-600 hover:text-gray-700"
        >
          Back to Time Entry List
        </Link>
      </div>
    );
  }

  const onSubmit = (data: EditTimeEntryFormData) => {
    updateMutation.mutate({
      authToken: token!,
      timeEntryId: parseInt(timeEntryId),
      ...data,
      date: new Date(data.date).toISOString(),
      description: data.description || null,
      reviewComment: data.reviewComment || null,
    });
  };

  const projects = projectsQuery.data?.projects || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Time Entry</h1>
          <p className="text-gray-600 mt-1">Update time entry details and status</p>
        </div>
        <Link
          to="/admin/tasks"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to List
        </Link>
      </div>

      {/* Employee Info Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {timeEntry.user.firstName[0]}
            {timeEntry.user.lastName[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {timeEntry.user.firstName} {timeEntry.user.lastName}
            </h2>
            <p className="text-gray-600">
              {timeEntry.user.employeeId} • {timeEntry.user.designation}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Time Entry Details</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                {...register("date", { required: "Date is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project *
              </label>
              <select
                {...register("projectId", {
                  required: "Project is required",
                  valueAsNumber: true,
                })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.client ? ` (${project.client})` : ""}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="mt-1 text-sm text-red-600">{errors.projectId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task *
              </label>
              <input
                type="text"
                {...register("task", { required: "Task is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Development, Testing, Meeting..."
              />
              {errors.task && (
                <p className="mt-1 text-sm text-red-600">{errors.task.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hours *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                {...register("hours", {
                  required: "Hours is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Hours must be at least 0" },
                  max: { value: 24, message: "Hours cannot exceed 24" },
                })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {errors.hours && (
                <p className="mt-1 text-sm text-red-600">{errors.hours.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                {...register("description")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Additional details about the work..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("isBillable")}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm font-medium text-gray-700">
                  This is billable work
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                {...register("status", { required: "Status is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>

            {(selectedStatus === "approved" || selectedStatus === "rejected") && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Comment
                </label>
                <textarea
                  rows={2}
                  {...register("reviewComment")}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Optional comment about the review decision..."
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              to="/admin/tasks"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Current Review Info */}
      {timeEntry.reviewedBy && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Review History</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">Reviewed by:</span>{" "}
              {timeEntry.reviewer
                ? `${timeEntry.reviewer.firstName} ${timeEntry.reviewer.lastName}`
                : "Unknown"}
            </p>
            {timeEntry.reviewedAt && (
              <p>
                <span className="font-medium">Reviewed at:</span>{" "}
                {new Date(timeEntry.reviewedAt).toLocaleString()}
              </p>
            )}
            {timeEntry.reviewComment && (
              <p>
                <span className="font-medium">Comment:</span> {timeEntry.reviewComment}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
