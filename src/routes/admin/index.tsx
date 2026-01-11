import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { Shield, UserPlus, FolderPlus, Clock, BarChart3, Calendar } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <AdminContent />
      </Layout>
    </ProtectedRoute>
  );
}

function AdminContent() {
  const user = useAuthStore((state) => state.user);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-950 rounded-2xl p-8 text-white mb-8 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1 text-lg">
              Manage your organization's employees and projects
            </p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-4 mt-6 border border-gray-700">
          <p className="text-sm text-gray-400">
            <strong>Welcome!</strong> Use the forms below to onboard new employees, create projects, and assign team members to projects.
            All changes take effect immediately and relevant team members will be notified.
          </p>
        </div>
      </div>

      {/* Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/admin/employees"
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border-2 border-gray-300 hover:border-gray-950"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-gray-800" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Employees</div>
              <div className="text-sm text-gray-500">Manage team members</div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            View, edit, and manage all employees. Onboard new team members, update details, and control access.
          </p>
        </Link>

        <Link
          to="/admin/projects"
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border-2 border-gray-300 hover:border-gray-950"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <FolderPlus className="w-6 h-6 text-gray-800" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Projects</div>
              <div className="text-sm text-gray-500">Manage projects</div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Create, update, and archive projects. Track progress, manage budgets, and assign team members.
          </p>
        </Link>

        <Link
          to="/admin/holidays"
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border-2 border-gray-300 hover:border-gray-950"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Holidays</div>
              <div className="text-sm text-gray-500">Manage public holidays</div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Create and manage upcoming holidays that all employees can see. Set public and optional holidays.
          </p>
        </Link>

        <Link
          to="/admin/leaves"
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border-2 border-gray-300 hover:border-gray-950"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-800" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Leave Types</div>
              <div className="text-sm text-gray-500">Configure quotas</div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Manage leave types and set default quotas. Configure approval rules and requirements.
          </p>
        </Link>

        <Link
          to="/admin/tasks"
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border-2 border-gray-300 hover:border-gray-950"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-800" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Time Entries</div>
              <div className="text-sm text-gray-500">Manage timesheets</div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            View and manage all time entries. Edit, approve, or reject submissions from any employee.
          </p>
        </Link>

        <Link
          to="/admin/reporting"
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border-2 border-gray-300 hover:border-gray-950"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-gray-800" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Reports</div>
              <div className="text-sm text-gray-500">Analytics dashboard</div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            View comprehensive reports on hours, project profitability, overtime tracking, and team productivity.
          </p>
        </Link>
      </div>
    </div>
  );
}
