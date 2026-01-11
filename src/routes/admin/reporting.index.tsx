import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Shield,
  Calendar,
  Briefcase,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/reporting/")({
  component: ReportingPage,
});

function ReportingPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <ReportingContent />
      </Layout>
    </ProtectedRoute>
  );
}

function ReportingContent() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const trpc = useTRPC();
  
  // Default to last 90 days
  const defaultEndDate = new Date().toISOString().split("T")[0];
  const defaultStartDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const reportingQuery = useQuery(
    trpc.getReportingData.queryOptions({
      authToken: token!,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
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

  if (reportingQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (reportingQuery.isError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Reports</h2>
        <p className="text-gray-600">Failed to load reporting data. Please try again.</p>
      </div>
    );
  }

  const data = reportingQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into team productivity and project performance
          </p>
        </div>
        <Link
          to="/admin"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Hours"
          value={data.overview.totalHours.toFixed(1)}
          subtitle={`${data.overview.billablePercentage.toFixed(1)}% billable`}
          icon={Clock}
          color="dark"
        />
        <StatCard
          title="Billable Hours"
          value={data.overview.billableHours.toFixed(1)}
          subtitle={`${data.overview.nonBillableHours.toFixed(1)}h non-billable`}
          icon={DollarSign}
          color="light"
        />
        <StatCard
          title="Active Projects"
          value={data.overview.totalProjects}
          subtitle="With logged hours"
          icon={Briefcase}
          color="dark"
        />
        <StatCard
          title="Team Members"
          value={data.overview.totalEmployees}
          subtitle={`${data.overview.averageHoursPerEmployee.toFixed(1)}h avg per person`}
          icon={Users}
          color="light"
        />
      </div>

      {/* Hours by Project */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-gray-950" />
          Hours by Project
        </h2>
        <div className="space-y-4">
          {data.projectHours.slice(0, 10).map((project) => (
            <div key={project.projectId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{project.projectName}</div>
                  <div className="text-sm text-gray-500">{project.client}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{project.totalHours.toFixed(1)}h</div>
                  <div className="text-sm text-gray-500">
                    {project.billableHours.toFixed(1)}h billable
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-950"
                    style={{
                      width: `${project.budgetHours ? Math.min((project.totalHours / project.budgetHours) * 100, 100) : 100}%`,
                    }}
                  />
                </div>
                {project.budgetHours && (
                  <div className="text-sm text-gray-600 min-w-[100px] text-right">
                    {project.utilization.toFixed(0)}% of {project.budgetHours}h budget
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Hours Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-gray-950" />
            Team Productivity
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billable Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.employeeHours.map((employee) => {
                const utilizationPercent = employee.totalHours > 0
                  ? (employee.billableHours / employee.totalHours) * 100
                  : 0;
                return (
                  <tr key={employee.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.employeeName}
                        </div>
                        <div className="text-xs text-gray-500">{employee.employeeId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employee.designation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.billableHours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.projectCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              utilizationPercent >= 80
                                ? "bg-gray-900"
                                : utilizationPercent >= 60
                                  ? "bg-gray-700"
                                  : "bg-gray-500"
                            }`}
                            style={{ width: `${utilizationPercent}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {utilizationPercent.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overtime Tracking */}
      {data.overtimeData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-gray-950" />
            Overtime Tracking
          </h2>
          <div className="space-y-3">
            {data.overtimeData.slice(0, 10).map((overtime, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-100 rounded-lg border border-gray-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-gray-800" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{overtime.employeeName}</div>
                    <div className="text-sm text-gray-600">
                      Week of {new Date(overtime.weekStart).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-950">
                    +{overtime.overtimeHours.toFixed(1)}h overtime
                  </div>
                  <div className="text-sm text-gray-600">
                    {overtime.totalHours.toFixed(1)}h total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Trends */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-gray-950" />
          Weekly Trends (Last 12 Weeks)
        </h2>
        <div className="space-y-3">
          {data.weeklyTrends.map((week, index) => {
            const billablePercent = week.totalHours > 0
              ? (week.billableHours / week.totalHours) * 100
              : 0;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">
                    Week of {new Date(week.weekStart).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {week.totalHours.toFixed(1)}h total ({week.billableHours.toFixed(1)}h billable)
                  </div>
                </div>
                <div className="flex gap-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="bg-gray-900 flex items-center justify-center text-xs font-medium text-white"
                    style={{ width: `${billablePercent}%` }}
                  >
                    {billablePercent > 15 && `${billablePercent.toFixed(0)}%`}
                  </div>
                  <div
                    className="bg-gray-400 flex items-center justify-center text-xs font-medium text-gray-900"
                    style={{ width: `${100 - billablePercent}%` }}
                  >
                    {100 - billablePercent > 15 && `${(100 - billablePercent).toFixed(0)}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  color: "dark" | "light";
};

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    dark: "bg-gray-950 text-white shadow-lg",
    light: "bg-white text-gray-950 shadow-lg border border-gray-200",
  };
  
  const iconBg = color === "dark" ? "bg-white/20" : "bg-gray-200";
  const iconText = color === "dark" ? "text-white" : "text-gray-800";
  const subtitleColor = color === "dark" ? "text-gray-400" : "text-gray-600";
  const titleColor = color === "dark" ? "text-white" : "text-gray-950";

  return (
    <div
      className={`rounded-xl p-6 ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconText}`} />
        </div>
      </div>
      <div className={`text-3xl font-bold mb-1 ${titleColor}`}>{value}</div>
      <div className={`text-sm font-medium mb-1 ${subtitleColor}`}>{title}</div>
      <div className={`text-xs opacity-75 ${subtitleColor}`}>{subtitle}</div>
    </div>
  );
}
