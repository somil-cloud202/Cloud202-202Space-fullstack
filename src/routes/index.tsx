import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { toast } from "sonner";
import {
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  Plus,
  CheckCircle,
  AlertCircle,
  Shield,
  Sparkles,
  Lightbulb,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { HolidayWidget } from "~/components/HolidayWidget";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <ProtectedRoute>
      <Layout>
        <DashboardContent />
      </Layout>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const trpc = useTRPC();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);

  const statsQuery = useQuery(
    trpc.getDashboardStats.queryOptions({
      authToken: token!,
    })
  );

  const insightsMutation = useMutation(
    trpc.generateDashboardInsights.mutationOptions({
      onSuccess: (data) => {
        setInsights(data.insights);
        setShowInsights(true);
      },
      onError: () => {
        toast.error("Failed to generate insights");
      },
    })
  );

  const handleGenerateInsights = () => {
    insightsMutation.mutate({
      authToken: token!,
    });
  };

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gray-950 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-400">
          Here's what's happening with your work today.
        </p>
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Work Insights</h2>
              <p className="text-sm text-gray-300">
                {user?.role === "admin"
                  ? "Organizational analysis and team productivity insights"
                  : "Personalized analysis of your work patterns"}
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={insightsMutation.isPending}
            className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {insightsMutation.isPending ? "Analyzing..." : "Generate Insights"}
          </button>
        </div>

        {showInsights && insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        )}

        {showInsights && insights.length === 0 && !insightsMutation.isPending && (
          <div className="text-center py-8 text-gray-300">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Not enough data to generate insights yet.</p>
            <p className="text-sm mt-1">
              {user?.role === "admin"
                ? "Team members need to log timesheets to generate organizational insights."
                : "Log some timesheets to get started!"}
            </p>
          </div>
        )}
      </div>

      {/* Admin Quick Access Banner */}
      {user?.role === "admin" && (
        <Link
          to="/admin"
          className="block bg-gray-800 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all group border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-700 backdrop-blur rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-500 font-medium mb-1">Admin Features</div>
                <h3 className="text-xl font-bold mb-1">Manage Employees & Projects</h3>
                <p className="text-sm text-gray-400">
                  Onboard employees, create projects, and assign team members →
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-white/80">
              <span className="text-sm">Go to Admin Dashboard</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Hours This Week"
          value={`${stats?.hoursThisWeek || 0}h`}
          subtitle={`Target: ${stats?.targetHours || 40}h`}
          icon={Clock}
          color="neutral"
          progress={(stats?.hoursThisWeek || 0) / (stats?.targetHours || 40)}
        />
        <StatCard
          title="Pending Timesheets"
          value={stats?.pendingTimesheets || 0}
          subtitle="Awaiting approval"
          icon={FileText}
          color="neutral"
        />
        <StatCard
          title="Leave Requests"
          value={stats?.pendingLeaveRequests || 0}
          subtitle="Pending approval"
          icon={Calendar}
          color="neutral"
        />
        <StatCard
          title="Annual Leave"
          value={
            stats?.leaveBalances?.find((lb) =>
              lb.leaveType.name.includes("Annual")
            )?.balance || 0
          }
          subtitle="Days remaining"
          icon={TrendingUp}
          color="neutral"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/timesheet"
            className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-300 hover:border-gray-950 hover:bg-gray-100 transition-all group"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-gray-950 transition-colors">
              <Clock className="w-6 h-6 text-gray-900 group-hover:text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Log Time</div>
              <div className="text-sm text-gray-500">Add timesheet entry</div>
            </div>
          </Link>

          <Link
            to="/leaves"
            className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-300 hover:border-gray-950 hover:bg-gray-100 transition-all group"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-gray-950 transition-colors">
              <Calendar className="w-6 h-6 text-gray-900 group-hover:text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Apply Leave</div>
              <div className="text-sm text-gray-500">Request time off</div>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-300 hover:border-gray-950 hover:bg-gray-100 transition-all group"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-gray-950 transition-colors">
              <FileText className="w-6 h-6 text-gray-900 group-hover:text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Update Profile</div>
              <div className="text-sm text-gray-500">Edit your information</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Leave Balances & Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Balances */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Leave Balances
          </h2>
          <div className="space-y-4">
            {statsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : stats?.leaveBalances && stats.leaveBalances.length > 0 ? (
              stats.leaveBalances.map((balance) => (
                <div key={balance.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {balance.leaveType.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {balance.used} used of {balance.allocated}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {balance.balance}
                    </div>
                    <div className="text-sm text-gray-500">days left</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No leave balances found
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <HolidayWidget />
      </div>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  color: "neutral";
  progress?: number;
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  progress,
}: StatCardProps) {
  const iconClasses = "bg-gray-950 text-white";
  const progressColor = "bg-gray-950";

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconClasses}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
      {progress !== undefined && (
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all`}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

type InsightCardProps = {
  insight: {
    title: string;
    description: string;
    type: "positive" | "suggestion" | "warning";
  };
};

function InsightCard({ insight }: InsightCardProps) {
  const iconMap = {
    positive: { icon: CheckCircle, color: "bg-green-500/20 text-green-300" },
    suggestion: { icon: Lightbulb, color: "bg-blue-500/20 text-blue-300" },
    warning: { icon: AlertTriangle, color: "bg-yellow-500/20 text-yellow-300" },
  };

  const config = iconMap[insight.type];
  const Icon = config.icon;

  return (
    <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{insight.title}</h3>
          <p className="text-sm text-gray-300">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}
