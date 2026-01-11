import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { UserCog, Shield, Loader2, UserX, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/admin/employees/$employeeId/edit")({
  component: EditEmployeePage,
});

type EditEmployeeFormData = {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  personalEmail?: string;
  address?: string;
  emergencyContact?: string;
  departmentId?: number;
  designation?: string;
  managerId?: number;
  role: "employee" | "manager" | "admin";
  employmentType: "full-time" | "part-time" | "contractor";
  skills?: string;
  certifications?: string;
};

function EditEmployeePage() {
  return (
    <ProtectedRoute>
      <Layout>
        <EditEmployeeContent />
      </Layout>
    </ProtectedRoute>
  );
}

function EditEmployeeContent() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { employeeId } = Route.useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const employeeQuery = useQuery(
    trpc.getEmployeeById.queryOptions({
      authToken: token!,
      employeeId: parseInt(employeeId),
    })
  );

  const employeesQuery = useQuery(
    trpc.getAllEmployees.queryOptions({
      authToken: token!,
    })
  );

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

  const updateMutation = useMutation(
    trpc.updateEmployee.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllEmployees.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getEmployeeById.queryKey(),
        });
        toast.success("Employee updated successfully!");
        navigate({ to: "/admin/employees" });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update employee");
      },
    })
  );

  const deactivateMutation = useMutation(
    trpc.deactivateEmployee.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllEmployees.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getEmployeeById.queryKey(),
        });
        toast.success("Employee status updated successfully!");
        navigate({ to: "/admin/employees" });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update employee status");
      },
    })
  );

  const employee = employeeQuery.data?.employee;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditEmployeeFormData>({
    values: employee
      ? {
          employeeId: employee.employeeId,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          phone: employee.phone || "",
          personalEmail: employee.personalEmail || "",
          address: employee.address || "",
          emergencyContact: employee.emergencyContact || "",
          departmentId: employee.departmentId || undefined,
          designation: employee.designation || "",
          managerId: employee.managerId || undefined,
          role: employee.role as any,
          employmentType: employee.employmentType as any,
          skills: employee.skills || "",
          certifications: employee.certifications || "",
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

  if (employeeQuery.isLoading || departmentsQuery.isLoading || managersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Not Found</h2>
        <p className="text-gray-600 mb-4">The employee you're looking for doesn't exist.</p>
        <Link
          to="/admin/employees"
          className="text-gray-600 hover:text-gray-700"
        >
          Back to Employee List
        </Link>
      </div>
    );
  }

  const onSubmit = (data: EditEmployeeFormData) => {
    updateMutation.mutate({
      authToken: token!,
      userId: parseInt(employeeId),
      ...data,
      departmentId: data.departmentId ? Number(data.departmentId) : null,
      managerId: data.managerId ? Number(data.managerId) : null,
      phone: data.phone || null,
      personalEmail: data.personalEmail || null,
      address: data.address || null,
      emergencyContact: data.emergencyContact || null,
      designation: data.designation || null,
      skills: data.skills || null,
      certifications: data.certifications || null,
    });
  };

  const handleStatusToggle = () => {
    const newStatus = employee.status === "active" ? "inactive" : "active";
    const message =
      newStatus === "inactive"
        ? "Are you sure you want to deactivate this employee?"
        : "Are you sure you want to reactivate this employee?";

    if (confirm(message)) {
      deactivateMutation.mutate({
        authToken: token!,
        userId: parseInt(employeeId),
        status: newStatus,
      });
    }
  };

  const departments = departmentsQuery.data?.departments || [];
  const managers = managersQuery.data?.managers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
          <p className="text-gray-600 mt-1">
            Update employee information and manage status
          </p>
        </div>
        <Link
          to="/admin/employees"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to List
        </Link>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-gray-600">{employee.employeeId}</p>
            </div>
          </div>
          <button
            onClick={handleStatusToggle}
            disabled={deactivateMutation.isPending}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              employee.status === "active"
                ? "bg-gray-300 text-gray-900 hover:bg-gray-400"
                : "bg-gray-700 text-white hover:bg-gray-800"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {employee.status === "active" ? (
              <>
                <UserX className="w-4 h-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Reactivate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <UserCog className="w-5 h-5 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Employee Information</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                {...register("employeeId", { required: "Employee ID is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {errors.employeeId && (
                <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                {...register("email", { required: "Email is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                {...register("firstName", { required: "First name is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                {...register("lastName", { required: "Last name is required" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                {...register("phone")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personal Email
              </label>
              <input
                type="email"
                {...register("personalEmail")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                {...register("address")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                {...register("emergencyContact")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                {...register("designation")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reporting Manager
              </label>
              <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type *
              </label>
              <select
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <textarea
                rows={2}
                {...register("skills")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="JavaScript, React, Node.js..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certifications
              </label>
              <textarea
                rows={2}
                {...register("certifications")}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="AWS Certified, PMP..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              to="/admin/employees"
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
    </div>
  );
}
