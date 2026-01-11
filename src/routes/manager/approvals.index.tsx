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
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/manager/approvals/")({
  component: ManagerApprovalsPage,
});

function ManagerApprovalsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <ManagerApprovalsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function ManagerApprovalsContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<"timesheets" | "leaves">("timesheets");
  const [reviewingTimesheet, setReviewingTimesheet] = useState<number | null>(null);
  const [reviewingLeave, setReviewingLeave] = useState<number | null>(null);

  // Check if user is manager or admin
  if (user?.role !== "manager" && user?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only managers can access this page.</p>
      </div>
    );
  }

  const timesheetsQuery = useQuery(
    trpc.getPendingTimesheets.queryOptions({
      authToken: token!,
    })
  );

  const leaveRequestsQuery = useQuery(
    trpc.getPendingLeaveRequests.queryOptions({
      authToken: token!,
    })
  );

  // Debug logging
  console.log("Pending leave requests query state:", {
    isLoading: leaveRequestsQuery.isLoading,
    isError: leaveRequestsQuery.isError,
    error: leaveRequestsQuery.error,
    dataLength: leaveRequestsQuery.data?.leaveRequests?.length,
    data: leaveRequestsQuery.data?.leaveRequests,
  });

  const reviewTimesheetMutation = useMutation(
    trpc.reviewTimesheet.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getPendingTimesheets.queryKey(),
        });
        setReviewingTimesheet(null);
      },
    })
  );

  const reviewLeaveMutation = useMutation(
    trpc.reviewLeaveRequest.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getPendingLeaveRequests.queryKey(),
        });
        setReviewingLeave(null);
      },
    })
  );

  const handleTimesheetReview = (
    timeEntryId: number,
    status: "approved" | "rejected",
    reviewComment?: string
  ) => {
    toast.promise(
      reviewTimesheetMutation.mutateAsync({
        authToken: token!,
        timeEntryId,
        status,
        reviewComment,
      }),
      {
        loading: `${status === "approved" ? "Approving" : "Rejecting"}...`,
        success: `Timesheet ${status}!`,
        error: "Failed to review timesheet",
      }
    );
  };

  const handleLeaveReview = (
    leaveRequestId: number,
    status: "approved" | "rejected",
    reviewComment?: string
  ) => {
    toast.promise(
      reviewLeaveMutation.mutateAsync({
        authToken: token!,
        leaveRequestId,
        status,
        reviewComment,
      }),
      {
        loading: `${status === "approved" ? "Approving" : "Rejecting"}...`,
        success: `Leave request ${status}!`,
        error: "Failed to review leave request",
      }
    );
  };

  const timesheets = timesheetsQuery.data?.timesheets || [];
  const leaveRequests = leaveRequestsQuery.data?.leaveRequests || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Review and approve pending requests from your team
          </p>
        </div>
        <button
          onClick={() => {
            console.log("Manual refresh triggered");
            timesheetsQuery.refetch();
            leaveRequestsQuery.refetch();
          }}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-950 rounded-xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Pending Timesheets</div>
              <div className="text-4xl font-bold">{timesheets.length}</div>
            </div>
            <div className="w-16 h-16 bg-gray-700 bg-opacity-30 rounded-lg flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 text-gray-950 shadow-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Pending Leave Requests</div>
              <div className="text-4xl font-bold">{leaveRequests.length}</div>
            </div>
            <div className="w-16 h-16 bg-gray-300 bg-opacity-30 rounded-lg flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("timesheets")}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "timesheets"
                ? "bg-gray-950 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Timesheets ({timesheets.length})
          </button>
          <button
            onClick={() => setActiveTab("leaves")}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "leaves"
                ? "bg-gray-950 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Leave Requests ({leaveRequests.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "timesheets" && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Pending Timesheets</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {timesheetsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : timesheets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No pending timesheets to review
              </div>
            ) : (
              timesheets.map((timesheet) => (
                <div key={timesheet.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold">
                        {timesheet.user.firstName[0]}{timesheet.user.lastName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {timesheet.user.firstName} {timesheet.user.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {timesheet.user.designation} • {timesheet.user.employeeId}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Project</div>
                        <div className="font-semibold text-gray-900">
                          {timesheet.project.name}
                        </div>
                        {timesheet.project.client && (
                          <div className="text-sm text-gray-600">
                            {timesheet.project.client}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Date</div>
                        <div className="font-semibold text-gray-900">
                          {new Date(timesheet.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Hours</div>
                        <div className="font-semibold text-gray-950">
                          {timesheet.hours}h
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Billable</div>
                        <div className="font-semibold text-gray-900">
                          {timesheet.isBillable ? "Yes" : "No"}
                        </div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 mb-1">Task</div>
                      <div className="text-sm text-gray-900">{timesheet.task}</div>
                    </div>
                    {timesheet.description && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Description</div>
                        <div className="text-sm text-gray-900">{timesheet.description}</div>
                      </div>
                    )}
                  </div>

                  {reviewingTimesheet === timesheet.id ? (
                    <ReviewForm
                      onApprove={(comment) =>
                        handleTimesheetReview(timesheet.id, "approved", comment)
                      }
                      onReject={(comment) =>
                        handleTimesheetReview(timesheet.id, "rejected", comment)
                      }
                      onCancel={() => setReviewingTimesheet(null)}
                      isLoading={reviewTimesheetMutation.isPending}
                      timeEntryId={timesheet.id}
                      reviewType="timesheet"
                    />
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setReviewingTimesheet(timesheet.id)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Pending Leave Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {leaveRequestsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : leaveRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No pending leave requests to review
              </div>
            ) : (
              leaveRequests.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold">
                        {request.user.firstName[0]}{request.user.lastName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {request.user.firstName} {request.user.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {request.user.designation} • {request.user.employeeId}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Leave Type</div>
                        <div className="font-semibold text-gray-900">
                          {request.leaveType.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {request.leaveType.isPaid ? "Paid" : "Unpaid"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">From</div>
                        <div className="font-semibold text-gray-900">
                          {new Date(request.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">To</div>
                        <div className="font-semibold text-gray-900">
                          {new Date(request.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {request.isHalfDay && (
                      <div className="mb-3">
                        <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-medium rounded">
                          Half Day ({request.halfDayPeriod})
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Reason</div>
                      <div className="text-sm text-gray-900">{request.reason}</div>
                    </div>
                    {request.backupUser && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-1">Backup Employee</div>
                        <div className="text-sm text-gray-900">
                          {request.backupUser.firstName} {request.backupUser.lastName} ({request.backupUser.employeeId})
                        </div>
                      </div>
                    )}
                  </div>

                  {reviewingLeave === request.id ? (
                    <ReviewForm
                      onApprove={(comment) =>
                        handleLeaveReview(request.id, "approved", comment)
                      }
                      onReject={(comment) =>
                        handleLeaveReview(request.id, "rejected", comment)
                      }
                      onCancel={() => setReviewingLeave(null)}
                      isLoading={reviewLeaveMutation.isPending}
                      reviewType="leave"
                    />
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setReviewingLeave(request.id)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewForm({
  onApprove,
  onReject,
  onCancel,
  isLoading,
  timeEntryId,
  reviewType,
}: {
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  timeEntryId?: number;
  reviewType?: "timesheet" | "leave";
}) {
  const token = useAuthStore((state) => state.token);
  const trpc = useTRPC();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm();

  const comment = watch("comment");

  const aiCommentMutation = useMutation(
    trpc.generateReviewComment.mutationOptions({
      onSuccess: (data) => {
        setValue("comment", data.comment);
        toast.success("AI comment generated!");
      },
      onError: () => {
        toast.error("Failed to generate comment");
      },
    })
  );

  const handleGenerateApprovalComment = () => {
    if (!timeEntryId) return;
    aiCommentMutation.mutate({
      authToken: token!,
      timeEntryId,
      reviewType: "approval",
    });
  };

  const handleGenerateRejectionComment = () => {
    if (!timeEntryId) return;
    aiCommentMutation.mutate({
      authToken: token!,
      timeEntryId,
      reviewType: "rejection",
      reason: comment || undefined,
    });
  };

  const onApproveSubmit = (data: any) => {
    onApprove(data.comment);
  };

  const onRejectSubmit = (data: any) => {
    onReject(data.comment);
  };

  return (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Review Comment (Optional)
          </label>
          {timeEntryId && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGenerateApprovalComment}
                disabled={aiCommentMutation.isPending}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                title="Generate approval comment"
              >
                <Sparkles className="w-3 h-3" />
                AI Approve
              </button>
              <button
                type="button"
                onClick={handleGenerateRejectionComment}
                disabled={aiCommentMutation.isPending}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
                title="Generate rejection comment"
              >
                <Sparkles className="w-3 h-3" />
                AI Reject
              </button>
            </div>
          )}
        </div>
        <textarea
          {...register("comment")}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Add a comment for the employee..."
        />
        {aiCommentMutation.isPending && (
          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-pulse" />
            Generating AI comment...
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleSubmit(onApproveSubmit)}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Approve
        </button>
        <button
          onClick={handleSubmit(onRejectSubmit)}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <XCircle className="w-5 h-5" />
          Reject
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
