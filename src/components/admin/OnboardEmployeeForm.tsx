import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";
import { UserPlus } from "lucide-react";

type OnboardEmployeeFormData = {
  employeeId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  departmentId?: number;
  designation?: string;
  managerId?: number;
  role: "employee" | "manager" | "admin";
  employmentType: "full-time" | "part-time" | "contractor";
  joinDate: string;
};

export function OnboardEmployeeForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OnboardEmployeeFormData>({
    defaultValues: {
      role: "employee",
      employmentType: "full-time",
      joinDate: new Date().toISOString().split("T")[0],
    },
  });

  const departmentsQuery = useQuery(
    trpc.getDepartments.queryOptions({
      authToken: token!,
    })
  );

  const managersQuery = useQuery(
    trpc.getManagers.queryOptions({
      authToken: token!,
    })
  );

  const onboardMutation = useMutation(
    trpc.onboardEmployee.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllEmployees.queryKey(),
        });
        reset();
      },
    })
  );

  const onSubmit = (data: OnboardEmployeeFormData) => {
    toast.promise(
      onboardMutation.mutateAsync({
        authToken: token!,
        ...data,
        departmentId: data.departmentId ? Number(data.departmentId) : undefined,
        managerId: data.managerId ? Number(data.managerId) : undefined,
        joinDate: new Date(data.joinDate).toISOString(),
      }),
      {
        loading: "Onboarding employee...",
        success: "Employee onboarded successfully!",
        error: "Failed to onboard employee",
      }
    );
  };

  const departments = departmentsQuery.data?.departments || [];
  const managers = managersQuery.data?.managers || [];

  if (departmentsQuery.isLoading || managersQuery.isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Onboard New Employee</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (departmentsQuery.isError || managersQuery.isError) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Onboard New Employee</h2>
        </div>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
          <p className="text-gray-800 text-sm">
            Failed to load form data. Please refresh the page and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-gray-800" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Onboard New Employee</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID *
            </label>
            <input
              id="employeeId"
              type="text"
              {...register("employeeId", { required: "Employee ID is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="EMP001"
            />
            {errors.employeeId && (
              <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              {...register("email", { required: "Email is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="employee@company.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              id="firstName"
              type="text"
              {...register("firstName", { required: "First name is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              id="lastName"
              type="text"
              {...register("lastName", { required: "Last name is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" },
              })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              {...register("phone")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              id="departmentId"
              {...register("departmentId")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
              Designation
            </label>
            <input
              id="designation"
              type="text"
              {...register("designation")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <label htmlFor="managerId" className="block text-sm font-medium text-gray-700 mb-1">
              Reporting Manager
            </label>
            <select
              id="managerId"
              {...register("managerId")}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select Manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName} ({manager.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="role"
              {...register("role", { required: "Role is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 mb-1">
              Employment Type *
            </label>
            <select
              id="employmentType"
              {...register("employmentType", { required: "Employment type is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contractor">Contractor</option>
            </select>
            {errors.employmentType && (
              <p className="mt-1 text-sm text-red-600">{errors.employmentType.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="joinDate" className="block text-sm font-medium text-gray-700 mb-1">
              Join Date *
            </label>
            <input
              id="joinDate"
              type="date"
              {...register("joinDate", { required: "Join date is required" })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.joinDate && (
              <p className="mt-1 text-sm text-red-600">{errors.joinDate.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={onboardMutation.isPending}
            className="px-6 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {onboardMutation.isPending ? "Onboarding..." : "Onboard Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
