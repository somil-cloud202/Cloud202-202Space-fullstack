import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { Clock, Search, Edit, Trash2, Shield, Calendar, CheckSquare, Square, Download } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/admin/tasks/")({
  component: TasksPage,
});

function TasksPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <TasksContent />
      </Layout>
    </ProtectedRoute>
  );
}

function TasksContent() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "submitted" | "approved" | "rejected">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const timeEntriesQuery = useQuery(
    trpc.getAllTimeEntries.queryOptions({
      authToken: token!,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    })
  );

  const deleteMutation = useMutation(
    trpc.adminDeleteTimeEntry.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllTimeEntries.queryKey(),
        });
        toast.success("Time entry deleted successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete time entry");
      },
    })
  );

  const bulkReviewMutation = useMutation(
    trpc.bulkReviewTimeEntries.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllTimeEntries.queryKey(),
        });
        setSelectedIds(new Set());
        toast.success(`${data.updatedCount} time entries updated successfully!`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update time entries");
      },
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

  if (timeEntriesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Time Entry Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (timeEntriesQuery.isError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Time Entries</h2>
        <p className="text-gray-600">Failed to load time entry data. Please try again.</p>
      </div>
    );
  }

  const allTimeEntries = timeEntriesQuery.data.timeEntries;
  
  // Filter time entries based on search
  const filteredTimeEntries = allTimeEntries.filter((entry) => {
    if (searchTerm === "") return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.user.firstName.toLowerCase().includes(searchLower) ||
      entry.user.lastName.toLowerCase().includes(searchLower) ||
      entry.user.employeeId.toLowerCase().includes(searchLower) ||
      entry.project.name.toLowerCase().includes(searchLower) ||
      entry.task.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = (timeEntryId: number, employeeName: string) => {
    if (confirm(`Are you sure you want to delete this time entry for ${employeeName}? This action cannot be undone.`)) {
      deleteMutation.mutate({
        authToken: token!,
        timeEntryId,
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredTimeEntries.map((e) => e.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectEntry = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    
    if (confirm(`Are you sure you want to approve ${selectedIds.size} time entries?`)) {
      bulkReviewMutation.mutate({
        authToken: token!,
        timeEntryIds: Array.from(selectedIds),
        status: "approved",
      });
    }
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    
    const comment = prompt(`You are about to reject ${selectedIds.size} time entries. Enter a reason (optional):`);
    if (comment !== null) {
      bulkReviewMutation.mutate({
        authToken: token!,
        timeEntryIds: Array.from(selectedIds),
        status: "rejected",
        reviewComment: comment || undefined,
      });
    }
  };

  const handleExport = async () => {
    try {
      toast.loading("Generating CSV export...", { id: "export" });
      
      const result = await trpcClient.exportApprovedTimeEntries.query({
        authToken: token!,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });

      // Create a blob and download it
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", result.filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${result.count} approved time entries`, { id: "export" });
    } catch (error: any) {
      toast.error(error.message || "Failed to export time entries", { id: "export" });
    }
  };

  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const billableHours = filteredTimeEntries.filter(e => e.isBillable).reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Entry Management</h1>
          <p className="text-gray-600 mt-1">Manage all time entries across the organization</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
          <Link
            to="/admin"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Admin Dashboard
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Entries</p>
              <p className="text-3xl font-bold mt-1">{allTimeEntries.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 text-gray-950 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Hours</p>
              <p className="text-3xl font-bold mt-1">{totalHours.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-800" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 text-gray-950 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Billable Hours</p>
              <p className="text-3xl font-bold mt-1">{billableHours.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-800" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 text-gray-950 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Review</p>
              <p className="text-3xl font-bold mt-1">
                {allTimeEntries.filter((e) => e.status === "submitted").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee, project, or task..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-gray-900" />
              <span className="font-medium text-gray-900">
                {selectedIds.size} {selectedIds.size === 1 ? "entry" : "entries"} selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkApprove}
                disabled={bulkReviewMutation.isPending}
                className="px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve Selected
              </button>
              <button
                onClick={handleBulkReject}
                disabled={bulkReviewMutation.isPending}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Entries Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredTimeEntries.length && filteredTimeEntries.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTimeEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No time entries found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredTimeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry.id)}
                        onChange={(e) => handleSelectEntry(entry.id, e.target.checked)}
                        className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                          {entry.user.firstName[0]}
                          {entry.user.lastName[0]}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.user.firstName} {entry.user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{entry.user.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.project.name}</div>
                      {entry.project.client && (
                        <div className="text-xs text-gray-500">{entry.project.client}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{entry.task}</div>
                      {entry.description && (
                        <div className="text-xs text-gray-500 max-w-xs truncate">
                          {entry.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.hours}h</div>
                      {entry.isBillable && (
                        <div className="text-xs text-gray-700">Billable</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === "approved"
                            ? "bg-gray-900 text-white"
                            : entry.status === "submitted"
                              ? "bg-gray-700 text-white"
                              : entry.status === "rejected"
                                ? "bg-gray-300 text-gray-900"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to="/admin/tasks/$timeEntryId/edit"
                          params={{ timeEntryId: entry.id.toString() }}
                          className="text-gray-900 hover:text-gray-700 inline-flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                        <button
                          onClick={() =>
                            handleDelete(
                              entry.id,
                              `${entry.user.firstName} ${entry.user.lastName}`
                            )
                          }
                          disabled={deleteMutation.isPending}
                          className="text-gray-700 hover:text-gray-900 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
