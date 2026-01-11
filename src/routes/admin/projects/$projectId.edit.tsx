import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { FolderOpen, Shield, Loader2, Upload, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";

export const Route = createFileRoute("/admin/projects/$projectId/edit")({
  component: EditProjectPage,
});

type EditProjectFormData = {
  name: string;
  client?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budgetHours?: number;
  status: "active" | "completed" | "on-hold";
  customerEmail?: string;
  customerPhone?: string;
  awsAccountNumber?: string;
};

function EditProjectPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <EditProjectContent />
      </Layout>
    </ProtectedRoute>
  );
}

function EditProjectContent() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery(
    trpc.getAllProjects.queryOptions({
      authToken: token!,
    })
  );

  const updateMutation = useMutation(
    trpc.updateProject.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllProjects.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getProjects.queryKey(),
        });
        toast.success("Project updated successfully!");
        navigate({ to: "/admin/projects" });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update project");
      },
    })
  );

  const project = projectsQuery.data?.projects.find(
    (p) => p.id === parseInt(projectId)
  );

  const [sowFile, setSowFile] = useState<File | null>(null);
  const [isUploadingSow, setIsUploadingSow] = useState(false);
  const [sowFileUrl, setSowFileUrl] = useState<string | null>(project?.sowFileUrl || null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProjectFormData>({
    values: project
      ? {
          name: project.name,
          client: project.client || "",
          description: project.description || "",
          startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
          endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
          budgetHours: project.budgetHours || undefined,
          status: project.status as any,
          customerEmail: project.customerEmail || "",
          customerPhone: project.customerPhone || "",
          awsAccountNumber: project.awsAccountNumber || "",
        }
      : undefined,
  });

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

  if (projectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h2>
        <p className="text-gray-600 mb-4">The project you're looking for doesn't exist.</p>
        <Link
          to="/admin/projects"
          className="text-gray-600 hover:text-gray-700"
        >
          Back to Project List
        </Link>
      </div>
    );
  }

  const handleSowFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSowFile(file);
    setIsUploadingSow(true);

    try {
      // Get presigned URL
      const { uploadUrl, objectName } = await trpc.getProjectSowUploadUrl.query({
        authToken: token!,
        fileName: file.name,
        fileType: file.type,
      });

      // Upload file to MinIO
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      setSowFileUrl(objectName);
      toast.success("SoW document uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload SoW document");
      setSowFile(null);
    } finally {
      setIsUploadingSow(false);
    }
  };

  const onSubmit = (data: EditProjectFormData) => {
    updateMutation.mutate({
      authToken: token!,
      projectId: parseInt(projectId),
      ...data,
      client: data.client || null,
      description: data.description || null,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      budgetHours: data.budgetHours ? Number(data.budgetHours) : null,
      customerEmail: data.customerEmail || null,
      customerPhone: data.customerPhone || null,
      awsAccountNumber: data.awsAccountNumber || null,
      sowFileUrl: sowFileUrl || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Project</h1>
          <p className="text-gray-600 mt-1">Update project information</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/projects/$projectId/sprints"
            params={{ projectId }}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sprint & Task Management
          </Link>
          <Link
            to="/admin/projects"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to List
          </Link>
        </div>
      </div>

      {/* Project Info Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
            {project.name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
            <p className="text-gray-600">
              {project.assignments.length} team members • {project._count.timeEntries} time entries
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Project Information</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                {...register("name", { required: "Project name is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <input
                type="text"
                {...register("client")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                {...register("customerEmail")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Contact Number
              </label>
              <input
                type="tel"
                {...register("customerPhone")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                {...register("description")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AWS Account Number
              </label>
              <input
                type="text"
                {...register("awsAccountNumber")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="123456789012"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                {...register("startDate")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                {...register("endDate")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="sowFile" className="block text-sm font-medium text-gray-700 mb-1">
                Project SoW (Statement of Work)
              </label>
              {project.sowFileUrl && !sowFile && (
                <div className="mb-2 text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Current file: {project.sowFileUrl.split('/').pop()}</span>
                </div>
              )}
              <div className="mt-1 flex items-center gap-4">
                <label
                  htmlFor="sowFile"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {sowFile ? "Change File" : project.sowFileUrl ? "Replace SoW" : "Upload SoW"}
                  </span>
                </label>
                <input
                  id="sowFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleSowFileChange}
                  disabled={isUploadingSow}
                  className="hidden"
                />
                {sowFile && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{sowFile.name}</span>
                  </div>
                )}
                {isUploadingSow && (
                  <span className="text-sm text-gray-500">Uploading...</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                {...register("budgetHours")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                {...register("status", { required: "Status is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              to="/admin/projects"
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

      {/* Team Members */}
      {project.assignments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Team Members</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {assignment.user.firstName[0]}
                  {assignment.user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {assignment.user.firstName} {assignment.user.lastName}
                  </div>
                  <div className="text-xs text-gray-500">{assignment.role || "Team Member"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
