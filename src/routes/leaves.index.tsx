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
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/leaves/")({
  component: LeavesPage,
});

function LeavesPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <LeavesContent />
      </Layout>
    </ProtectedRoute>
  );
}

function LeavesContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const [showApplyForm, setShowApplyForm] = useState(false);

  const balancesQuery = useQuery(
    trpc.getLeaveBalances.queryOptions({
      authToken: token!,
    })
  );

  const requestsQuery = useQuery(
    trpc.getLeaveRequests.queryOptions({
      authToken: token!,
    })
  );

  // Debug logging
  console.log("Leave requests query state:", {
    isLoading: requestsQuery.isLoading,
    isError: requestsQuery.isError,
    error: requestsQuery.error,
    dataLength: requestsQuery.data?.leaveRequests?.length,
    data: requestsQuery.data?.leaveRequests,
  });

  const leaveTypesQuery = useQuery(
    trpc.getLeaveTypes.queryOptions({
      authToken: token!,
    })
  );

  const holidaysQuery = useQuery(
    trpc.getHolidays.queryOptions({
      authToken: token!,
    })
  );

  const createRequestMutation = useMutation(
    trpc.createLeaveRequest.mutationOptions({
      onSuccess: () => {
        console.log("Leave request created successfully, invalidating queries...");

        // Invalidate with specific parameters
        queryClient.invalidateQueries({
          queryKey: trpc.getLeaveRequests.queryKey({ authToken: token! }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getLeaveBalances.queryKey({ authToken: token! }),
        });

        // Also invalidate all queries with these procedure names
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'getLeaveRequests' ||
            query.queryKey[0] === 'getLeaveBalances'
        });

        // Force refetch
        requestsQuery.refetch();
        balancesQuery.refetch();

        setShowApplyForm(false);
      },
      onError: (error) => {
        console.error("Failed to create leave request:", error);
      },
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Leaves</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              console.log("Manual refresh triggered");
              requestsQuery.refetch();
              balancesQuery.refetch();
            }}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowApplyForm(true)}
            className="px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {balancesQuery.isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading balances...
          </div>
        ) : (
          balancesQuery.data?.leaveBalances.map((balance) => (
            <div
              key={balance.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-gray-800" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {balance.balance}
              </div>
              <div className="text-sm font-medium text-gray-600 mb-1">
                {balance.leaveType.name}
              </div>
              <div className="text-xs text-gray-500">
                {balance.used} used of {balance.allocated}
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-950 transition-all"
                  style={{
                    width: `${(balance.used / balance.allocated) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Apply Leave Form */}
      {showApplyForm && (
        <LeaveApplicationForm
          leaveTypes={leaveTypesQuery.data?.leaveTypes || []}
          onSubmit={(data) => {
            toast.promise(
              createRequestMutation.mutateAsync({
                authToken: token!,
                ...data,
              }),
              {
                loading: "Submitting request...",
                success: "Leave request submitted!",
                error: (err: any) =>
                  err.message || "Failed to submit request",
              }
            );
          }}
          onCancel={() => setShowApplyForm(false)}
          isLoading={createRequestMutation.isPending}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Requests */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">My Requests</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {requestsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : requestsQuery.data?.leaveRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No leave requests yet
              </div>
            ) : (
              requestsQuery.data?.leaveRequests.map((request) => (
                <div key={request.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {request.leaveType.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(request.startDate).toLocaleDateString()} -{" "}
                        {new Date(request.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <LeaveStatusBadge status={request.status} />
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    <strong>Reason:</strong> {request.reason}
                  </div>
                  {request.backupUser && (
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Backup:</strong> {request.backupUser.firstName} {request.backupUser.lastName} ({request.backupUser.employeeId})
                    </div>
                  )}
                  {request.reviewComment && (
                    <div className={`text-sm mt-2 p-3 rounded-lg ${
                      request.status === "rejected"
                        ? "bg-gray-200 text-gray-800 border border-gray-400"
                        : "bg-gray-100 text-gray-800 border border-gray-300"
                    }`}>
                      <strong>Manager's Comment:</strong> {request.reviewComment}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Holidays */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Upcoming Holidays
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Public and optional holidays for {new Date().getFullYear()}
            </p>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {holidaysQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : holidaysQuery.data?.holidays.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No holidays found</p>
                <p className="text-xs">Contact admin to add holidays</p>
              </div>
            ) : (
              holidaysQuery.data?.holidays.map((holiday) => {
                const holidayDate = new Date(holiday.date);
                const today = new Date();
                const isUpcoming = holidayDate >= today;
                const isPast = holidayDate < today;

                return (
                  <div
                    key={holiday.id}
                    className={`p-4 flex items-center gap-4 transition-colors ${
                      isPast ? 'opacity-60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                      holiday.isOptional
                        ? 'bg-yellow-100 border-2 border-yellow-300'
                        : 'bg-blue-100 border-2 border-blue-300'
                    }`}>
                      <div className={`text-xs font-medium ${
                        holiday.isOptional ? 'text-yellow-800' : 'text-blue-800'
                      }`}>
                        {holidayDate.toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </div>
                      <div className={`text-xl font-bold ${
                        holiday.isOptional ? 'text-yellow-900' : 'text-blue-900'
                      }`}>
                        {holidayDate.getDate()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold text-gray-900">
                          {holiday.name}
                        </div>
                        {holiday.isOptional && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Optional
                          </span>
                        )}
                        {!holiday.isOptional && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Public Holiday
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {holidayDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      {isUpcoming && (
                        <div className="text-xs text-green-600 mt-1">
                          {Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days away
                        </div>
                      )}
                      {isPast && (
                        <div className="text-xs text-gray-500 mt-1">
                          Past holiday
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveApplicationForm({
  leaveTypes,
  onSubmit,
  onCancel,
  isLoading,
}: {
  leaveTypes: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const trpc = useTRPC();
  const token = useAuthStore((state) => state.token);

  const employeesQuery = useQuery(
    trpc.getEmployeesForBackup.queryOptions({
      authToken: token!,
    })
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      isHalfDay: false,
    },
  });

  const isHalfDay = watch("isHalfDay");

  const onFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      leaveTypeId: parseInt(data.leaveTypeId),
      backupUserId: data.backupUserId ? parseInt(data.backupUserId) : undefined,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
    });
  };

  const employees = employeesQuery.data?.employees || [];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Apply for Leave
      </h3>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leave Type
          </label>
          <select
            {...register("leaveTypeId", {
              required: "Leave type is required",
            })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">Select leave type</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          {errors.leaveTypeId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.leaveTypeId.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="halfDay"
            {...register("isHalfDay")}
            className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
          />
          <label htmlFor="halfDay" className="text-sm font-medium text-gray-700">
            Half Day
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              {...register("startDate", {
                required: "Start date is required",
              })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.startDate.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              {...register("endDate", { required: "End date is required" })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>

        {isHalfDay && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Half Day Period
            </label>
            <select
              {...register("halfDayPeriod")}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="AM">Morning (AM)</option>
              <option value="PM">Afternoon (PM)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason
          </label>
          <textarea
            {...register("reason", { required: "Reason is required" })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="Please provide a reason for your leave..."
          />
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Backup Employee (Optional)
          </label>
          <select
            {...register("backupUserId")}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">Select backup employee</option>
            {employeesQuery.isLoading ? (
              <option disabled>Loading employees...</option>
            ) : (
              employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} ({employee.employeeId})
                  {employee.designation && ` - ${employee.designation}`}
                  {employee.department?.name && ` - ${employee.department.name}`}
                </option>
              ))
            )}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Select a colleague who can cover your responsibilities during your leave
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Submitting..." : "Submit Request"}
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

function LeaveStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: {
      color: "bg-gray-200 text-gray-800",
      icon: Clock,
      label: "Pending",
    },
    approved: {
      color: "bg-gray-950 text-white",
      icon: CheckCircle,
      label: "Approved",
    },
    rejected: {
      color: "bg-gray-700 text-white",
      icon: XCircle,
      label: "Rejected",
    },
    cancelled: {
      color: "bg-gray-300 text-gray-800",
      icon: AlertCircle,
      label: "Cancelled",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
