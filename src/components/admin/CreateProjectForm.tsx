import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";
import { FolderPlus, Upload, FileText } from "lucide-react";
import { useState } from "react";

type CreateProjectFormData = {
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

export function CreateProjectForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  const [sowFile, setSowFile] = useState<File | null>(null);
  const [isUploadingSow, setIsUploadingSow] = useState(false);
  const [sowFileUrl, setSowFileUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectFormData>({
    defaultValues: {
      status: "active",
    },
  });

  const createProjectMutation = useMutation(
    trpc.createProject.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getProjects.queryKey(),
        });
        toast.success("Project created successfully! You can now assign employees to it.");
        reset();
        setSowFile(null);
        setSowFileUrl(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create project");
      },
    })
  );

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

  const onSubmit = (data: CreateProjectFormData) => {
    createProjectMutation.mutate({
      authToken: token!,
      ...data,
      budgetHours: data.budgetHours ? Number(data.budgetHours) : undefined,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      sowFileUrl: sowFileUrl || undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
          <FolderPlus className="w-5 h-5 text-gray-800" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              {...register("name", { required: "Project name is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Website Redesign"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <input
              id="client"
              type="text"
              {...register("client")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Customer Email
            </label>
            <input
              id="customerEmail"
              type="email"
              {...register("customerEmail")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Customer Contact Number
            </label>
            <input
              id="customerPhone"
              type="tel"
              {...register("customerPhone")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Project description..."
            />
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              {...register("startDate")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              {...register("endDate")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="budgetHours" className="block text-sm font-medium text-gray-700 mb-1">
              Budget Hours
            </label>
            <input
              id="budgetHours"
              type="number"
              step="0.5"
              min="0"
              {...register("budgetHours")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="160"
            />
          </div>

          <div>
            <label htmlFor="awsAccountNumber" className="block text-sm font-medium text-gray-700 mb-1">
              AWS Account Number
            </label>
            <input
              id="awsAccountNumber"
              type="text"
              {...register("awsAccountNumber")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="123456789012"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="sowFile" className="block text-sm font-medium text-gray-700 mb-1">
              Project SoW (Statement of Work)
            </label>
            <div className="mt-1 flex items-center gap-4">
              <label
                htmlFor="sowFile"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">
                  {sowFile ? "Change File" : "Upload SoW"}
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
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              id="status"
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

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={createProjectMutation.isPending}
            className="px-6 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createProjectMutation.isPending ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
