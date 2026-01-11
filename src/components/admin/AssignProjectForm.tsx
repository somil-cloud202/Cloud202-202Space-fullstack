import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";
import { UserCog } from "lucide-react";

type AssignProjectFormData = {
  userId: number;
  projectId: number;
  role?: string;
};

export function AssignProjectForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignProjectFormData>();

  const employeesQuery = useQuery(
    trpc.getAllEmployees.queryOptions({
      authToken: token!,
    })
  );

  const projectsQuery = useQuery(
    trpc.getProjects.queryOptions({
      authToken: token!,
    })
  );

  const assignProjectMutation = useMutation(
    trpc.assignProjectToEmployee.mutationOptions({
      onSuccess: () => {
        toast.success("Employee assigned to project successfully!");
        reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to assign project");
      },
    })
  );

  const onSubmit = (data: AssignProjectFormData) => {
    assignProjectMutation.mutateAsync({
      authToken: token!,
      userId: Number(data.userId),
      projectId: Number(data.projectId),
      role: data.role || undefined,
    });
  };

  if (employeesQuery.isLoading || projectsQuery.isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <UserCog className="w-5 h-5 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Assign Project to Employee</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (employeesQuery.isError || projectsQuery.isError) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <UserCog className="w-5 h-5 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Assign Project to Employee</h2>
        </div>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
          <p className="text-gray-800 text-sm">
            Failed to load form data. Please refresh the page and try again.
          </p>
        </div>
      </div>
    );
  }

  const employees = employeesQuery.data?.employees || [];
  const projects = projectsQuery.data?.projects || [];

  const hasNoEmployees = employees.length === 0;
  const hasNoProjects = projects.length === 0;

  if (hasNoEmployees || hasNoProjects) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <UserCog className="w-5 h-5 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Assign Project to Employee</h2>
        </div>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
          <p className="text-gray-800 text-sm">
            {hasNoEmployees && hasNoProjects && "Please create employees and projects first before making assignments."}
            {hasNoEmployees && !hasNoProjects && "Please onboard employees first before making assignments."}
            {!hasNoEmployees && hasNoProjects && "Please create projects first before making assignments."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
          <UserCog className="w-5 h-5 text-gray-800" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Assign Project to Employee</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
              Employee *
            </label>
            <select
              id="userId"
              {...register("userId", { required: "Employee is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select Employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} ({employee.employeeId}) - {employee.designation || employee.role}
                </option>
              ))}
            </select>
            {errors.userId && (
              <p className="mt-1 text-sm text-red-600">{errors.userId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              id="projectId"
              {...register("projectId", { required: "Project is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} {project.client ? `- ${project.client}` : ""}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-sm text-red-600">{errors.projectId.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role on Project
            </label>
            <input
              id="role"
              type="text"
              {...register("role")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Developer, Designer, QA, etc."
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={assignProjectMutation.isPending}
            className="px-6 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignProjectMutation.isPending ? "Assigning..." : "Assign Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
