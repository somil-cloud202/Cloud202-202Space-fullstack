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
  Clock,
  Plus,
  Save,
  Trash2,
  Send,
  Edit,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/timesheet/")({
  component: TimesheetPage,
});

function TimesheetPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <TimesheetContent />
      </Layout>
    </ProtectedRoute>
  );
}

function TimesheetContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<number | null>(null);

  // Get current week's date range
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const timeEntriesQuery = useQuery(
    trpc.getTimeEntries.queryOptions({
      authToken: token!,
      startDate: startOfWeek.toISOString(),
      endDate: endOfWeek.toISOString(),
    })
  );

  const projectsQuery = useQuery(
    trpc.getProjects.queryOptions({
      authToken: token!,
    })
  );

  const createEntryMutation = useMutation(
    trpc.createTimeEntry.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getTimeEntries.queryKey(),
        });
        // Don't close form here - let the submit handlers control this
      },
    })
  );

  const updateEntryMutation = useMutation(
    trpc.updateTimeEntry.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getTimeEntries.queryKey(),
        });
        setEditingEntry(null);
      },
    })
  );

  const deleteEntryMutation = useMutation(
    trpc.deleteTimeEntry.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getTimeEntries.queryKey(),
        });
      },
    })
  );

  const entries = timeEntriesQuery.data?.timeEntries || [];
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

  const handleDelete = (entryId: number) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      toast.promise(
        deleteEntryMutation.mutateAsync({
          authToken: token!,
          timeEntryId: entryId,
        }),
        {
          loading: "Deleting...",
          success: "Entry deleted!",
          error: "Failed to delete entry",
        }
      );
    }
  };

  const handleSubmit = (entryId: number) => {
    toast.promise(
      updateEntryMutation.mutateAsync({
        authToken: token!,
        timeEntryId: entryId,
        status: "submitted",
      }),
      {
        loading: "Submitting...",
        success: "Entry submitted for approval!",
        error: "Failed to submit entry",
      }
    );
  };

  const handleSubmitEntry = (data: any) => {
    toast.promise(
      createEntryMutation.mutateAsync({
        authToken: token!,
        ...data,
      }).then(() => {
        setShowAddForm(false);
      }),
      {
        loading: "Creating entry...",
        success: "Entry created!",
        error: "Failed to create entry",
      }
    );
  };

  const handleSubmitAndAddAnother = (data: any) => {
    toast.promise(
      createEntryMutation.mutateAsync({
        authToken: token!,
        ...data,
      }),
      {
        loading: "Creating entry...",
        success: "Entry created! Add another entry below.",
        error: "Failed to create entry",
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Timesheet</h1>
          <p className="text-gray-600 mt-1">
            Week of {startOfWeek.toLocaleDateString()} -{" "}
            {endOfWeek.toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Entry
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-950 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400 mb-1">Total Hours This Week</div>
            <div className="text-4xl font-bold">{totalHours}h</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">Target</div>
            <div className="text-2xl font-bold">40h</div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${Math.min((totalHours / 40) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <TimeEntryForm
          projects={projectsQuery.data?.projects || []}
          onSubmit={handleSubmitEntry}
          onSubmitAndAddAnother={handleSubmitAndAddAnother}
          onCancel={() => setShowAddForm(false)}
          isLoading={createEntryMutation.isPending}
        />
      )}

      {/* Time Entries List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Time Entries</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {timeEntriesQuery.isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No time entries for this week. Click "Add Entry" to get started.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">
                        {entry.project.name}
                      </span>
                      <StatusBadge status={entry.status} />
                      {entry.isBillable && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-medium rounded">
                          Billable
                        </span>
                      )}
                    </div>
                    {entry.taskRecord && (
                      <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <strong>Linked Task:</strong> 
                        <span className="font-medium">{entry.taskRecord.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          entry.taskRecord.status === "done"
                            ? "bg-green-100 text-green-800"
                            : entry.taskRecord.status === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}>
                          {entry.taskRecord.status}
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>Task:</strong> {entry.task}
                    </div>
                    {entry.description && (
                      <div className="text-sm text-gray-600 mb-1">
                        <strong>Description:</strong> {entry.description}
                      </div>
                    )}
                    {entry.reviewComment && (
                      <div className={`text-sm mt-2 p-2 rounded ${
                        entry.status === "rejected" 
                          ? "bg-gray-200 text-gray-800 border border-gray-400" 
                          : "bg-gray-100 text-gray-800 border border-gray-300"
                      }`}>
                        <strong>Manager's Comment:</strong> {entry.reviewComment}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                      <span>
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-gray-950">
                        {entry.hours}h
                      </span>
                    </div>
                  </div>
                  {entry.status === "draft" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSubmit(entry.id)}
                        className="p-2 text-gray-950 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Submit for approval"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TimeEntryForm({
  projects,
  onSubmit,
  onSubmitAndAddAnother,
  onCancel,
  isLoading,
}: {
  projects: any[];
  onSubmit: (data: any) => void;
  onSubmitAndAddAnother: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const token = useAuthStore((state) => state.token);
  const trpc = useTRPC();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      hours: 8,
      isBillable: true,
      status: "draft" as const,
      taskId: "",
      task: "",
      projectId: "",
      description: "",
    },
  });

  const projectId = watch("projectId");

  // Fetch tasks when project is selected
  const tasksQuery = useQuery({
    ...trpc.getProjectTasks.queryOptions({
      authToken: token!,
      projectId: parseInt(projectId),
    }),
    enabled: !!projectId,
  });

  // AI suggestion mutation
  const aiSuggestionMutation = useMutation(
    trpc.suggestTaskDescription.mutationOptions({
      onSuccess: (data) => {
        setValue("task", data.suggestion);
        toast.success("AI suggestion applied!");
      },
      onError: () => {
        toast.error("Failed to generate suggestion");
      },
    })
  );

  const handleAISuggestion = () => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }
    aiSuggestionMutation.mutate({
      authToken: token!,
      projectId: parseInt(projectId),
    });
  };

  const tasks = tasksQuery.data?.tasks || [];

  const onFormSubmit = (data: any, keepOpen: boolean) => {
    const submitData = {
      ...data,
      date: new Date(data.date).toISOString(),
      projectId: parseInt(data.projectId),
      taskId: data.taskId ? parseInt(data.taskId) : undefined,
      hours: parseFloat(data.hours),
    };
    
    if (keepOpen) {
      onSubmitAndAddAnother(submitData);
      // Reset form after submission
      reset({
        date: new Date().toISOString().split("T")[0],
        hours: 8,
        isBillable: true,
        status: "draft" as const,
        taskId: "",
        task: "",
        projectId: "",
        description: "",
      });
      setSelectedProjectId(null);
    } else {
      onSubmit(submitData);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Add Time Entry</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> You can add multiple time entries for different tasks and projects. Use "Save & Add Another" to quickly log multiple tasks for the same day.
        </p>
      </div>
      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              {...register("date", { required: "Date is required" })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              {...register("projectId", { required: "Project is required" })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} {project.client && `(${project.client})`}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.projectId.message}
              </p>
            )}
          </div>
        </div>

        {projectId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task (Optional - select from project tasks)
            </label>
            <select
              {...register("taskId")}
              onChange={(e) => {
                const selectedTaskId = e.target.value;
                if (selectedTaskId) {
                  const selectedTask = tasks.find(
                    (t) => t.id === parseInt(selectedTaskId)
                  );
                  if (selectedTask) {
                    setValue("task", selectedTask.title);
                  }
                }
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select a task (or enter custom below)</option>
              {tasksQuery.isLoading ? (
                <option disabled>Loading tasks...</option>
              ) : tasks.length === 0 ? (
                <option disabled>No tasks available</option>
              ) : (
                tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title} ({task.status})
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Task Description
            </label>
            <button
              type="button"
              onClick={handleAISuggestion}
              disabled={!projectId || aiSuggestionMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3 h-3" />
              {aiSuggestionMutation.isPending ? "Generating..." : "AI Suggest"}
            </button>
          </div>
          <input
            type="text"
            {...register("task", { required: "Task description is required" })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="e.g., Frontend development (auto-filled if task selected above)"
          />
          {errors.task && (
            <p className="mt-1 text-sm text-red-600">{errors.task.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hours
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            {...register("hours", {
              required: "Hours is required",
              min: { value: 0, message: "Hours must be positive" },
              max: { value: 24, message: "Hours cannot exceed 24" },
            })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          {errors.hours && (
            <p className="mt-1 text-sm text-red-600">{errors.hours.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            {...register("description")}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="Add any additional details..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="billable"
            {...register("isBillable")}
            className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
          />
          <label htmlFor="billable" className="text-sm font-medium text-gray-700">
            Billable
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleSubmit((data) => onFormSubmit(data, true))}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {isLoading ? "Saving..." : "Save & Add Another"}
          </button>
          <button
            type="button"
            onClick={handleSubmit((data) => onFormSubmit(data, false))}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isLoading ? "Saving..." : "Save & Close"}
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

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    draft: { color: "bg-gray-200 text-gray-800", icon: Edit, label: "Draft" },
    submitted: {
      color: "bg-gray-700 text-white",
      icon: Clock,
      label: "Pending",
    },
    approved: {
      color: "bg-gray-950 text-white",
      icon: CheckCircle2,
      label: "Approved",
    },
    rejected: {
      color: "bg-gray-400 text-gray-900",
      icon: XCircle,
      label: "Rejected",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
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
