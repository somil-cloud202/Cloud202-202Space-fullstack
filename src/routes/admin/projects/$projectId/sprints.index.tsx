import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { TaskCommentSection } from "~/components/projectManagement/TaskCommentSection";
import { 
  Calendar, 
  Plus, 
  ArrowLeft, 
  Target, 
  CheckCircle2, 
  Circle,
  Clock,
  AlertCircle,
  User,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/admin/projects/$projectId/sprints/")({
  component: ProjectSprintsPage,
});

function ProjectSprintsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <ProjectSprintsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function ProjectSprintsContent() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { projectId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const projectsQuery = useQuery(
    trpc.getAllProjects.queryOptions({
      authToken: token!,
    })
  );

  const sprintsQuery = useQuery(
    trpc.getSprints.queryOptions({
      authToken: token!,
      projectId: parseInt(projectId),
    })
  );

  const tasksQuery = useQuery(
    trpc.getTasks.queryOptions({
      authToken: token!,
      projectId: parseInt(projectId),
      sprintId: selectedSprintId ?? undefined,
    })
  );

  const employeesQuery = useQuery(
    trpc.getAllEmployees.queryOptions({
      authToken: token!,
    })
  );

  const project = projectsQuery.data?.projects.find(
    (p) => p.id === parseInt(projectId)
  );

  if (user?.role !== "admin" && user?.role !== "manager") {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only admins and managers can access this page.</p>
      </div>
    );
  }

  if (projectsQuery.isLoading || sprintsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h2>
        <Link to="/admin/projects" className="text-gray-600 hover:text-gray-700">
          Back to Projects
        </Link>
      </div>
    );
  }

  const sprints = sprintsQuery.data?.sprints || [];
  const tasks = tasksQuery.data?.tasks || [];

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/projects/$projectId/edit"
            params={{ projectId }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">Sprint & Task Management</p>
          </div>
        </div>
      </div>

      {/* Sprints Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-800" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sprints</h2>
          </div>
          <button
            onClick={() => setShowSprintForm(!showSprintForm)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Sprint
          </button>
        </div>

        {showSprintForm && (
          <SprintForm
            projectId={parseInt(projectId)}
            onClose={() => setShowSprintForm(false)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <button
            onClick={() => setSelectedSprintId(null)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedSprintId === null
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-semibold text-gray-900">All Tasks</div>
            <div className="text-sm text-gray-600 mt-1">View all project tasks</div>
          </button>
          {sprints.map((sprint) => (
            <button
              key={sprint.id}
              onClick={() => setSelectedSprintId(sprint.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedSprintId === sprint.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{sprint.name}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    sprint.status === "active"
                      ? "bg-green-100 text-green-800"
                      : sprint.status === "completed"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {sprint.status}
                </span>
              </div>
              {sprint.goal && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{sprint.goal}</p>
              )}
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {new Date(sprint.startDate).toLocaleDateString()} -{" "}
                {new Date(sprint.endDate).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {sprint._count.tasks} tasks
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Kanban Board */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tasks</h2>
              {selectedSprintId && (
                <p className="text-sm text-gray-600">
                  {sprints.find((s) => s.id === selectedSprintId)?.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        {showTaskForm && (
          <TaskForm
            projectId={parseInt(projectId)}
            sprintId={selectedSprintId}
            employees={employeesQuery.data?.employees || []}
            onClose={() => setShowTaskForm(false)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <TaskColumn
            title="To Do"
            tasks={todoTasks}
            icon={<Circle className="w-5 h-5" />}
            color="gray"
            employees={employeesQuery.data?.employees || []}
          />
          <TaskColumn
            title="In Progress"
            tasks={inProgressTasks}
            icon={<Clock className="w-5 h-5" />}
            color="blue"
            employees={employeesQuery.data?.employees || []}
          />
          <TaskColumn
            title="Done"
            tasks={doneTasks}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="green"
            employees={employeesQuery.data?.employees || []}
          />
        </div>
      </div>
    </div>
  );
}

function SprintForm({
  projectId,
  onClose,
}: {
  projectId: number;
  onClose: () => void;
}) {
  const token = useAuthStore((state) => state.token);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    startDate: "",
    endDate: "",
    status: "planned" as "planned" | "active" | "completed",
  });

  const createSprintMutation = useMutation(
    trpc.createSprint.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getSprints.queryKey(),
        });
        toast.success("Sprint created successfully!");
        onClose();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create sprint");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSprintMutation.mutate({
      authToken: token!,
      projectId,
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sprint Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="Sprint 1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as "planned" | "active" | "completed",
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date *
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date *
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sprint Goal
          </label>
          <textarea
            value={formData.goal}
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="What do we want to achieve in this sprint?"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createSprintMutation.isPending}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {createSprintMutation.isPending ? "Creating..." : "Create Sprint"}
        </button>
      </div>
    </form>
  );
}

function TaskForm({
  projectId,
  sprintId,
  employees,
  onClose,
}: {
  projectId: number;
  sprintId: number | null;
  employees: any[];
  onClose: () => void;
}) {
  const token = useAuthStore((state) => state.token);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo" as "todo" | "in-progress" | "done",
    priority: "medium" as "low" | "medium" | "high",
    assignedToId: "",
    estimatedHours: "",
  });

  const createTaskMutation = useMutation(
    trpc.createTask.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getTasks.queryKey(),
        });
        toast.success("Task created successfully!");
        onClose();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create task");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      authToken: token!,
      projectId,
      sprintId: sprintId ?? undefined,
      ...formData,
      assignedToId: formData.assignedToId ? parseInt(formData.assignedToId) : undefined,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="Implement user authentication"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="Task details..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as "todo" | "in-progress" | "done",
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: e.target.value as "low" | "medium" | "high",
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign To
          </label>
          <select
            value={formData.assignedToId}
            onChange={(e) =>
              setFormData({ ...formData, assignedToId: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">Unassigned</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Hours
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={formData.estimatedHours}
            onChange={(e) =>
              setFormData({ ...formData, estimatedHours: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="8"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createTaskMutation.isPending}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {createTaskMutation.isPending ? "Creating..." : "Create Task"}
        </button>
      </div>
    </form>
  );
}

function TaskColumn({
  title,
  tasks,
  icon,
  color,
  employees,
}: {
  title: string;
  tasks: any[];
  icon: React.ReactNode;
  color: string;
  employees: any[];
}) {
  const colorClasses = {
    gray: "bg-gray-100 text-gray-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
  };

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center gap-2 p-3 rounded-t-lg ${colorClasses[color as keyof typeof colorClasses]}`}
      >
        {icon}
        <span className="font-semibold">{title}</span>
        <span className="ml-auto text-sm">({tasks.length})</span>
      </div>
      <div className="bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[400px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} employees={employees} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, employees }: { task: any; employees: any[] }) {
  const token = useAuthStore((state) => state.token);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation(
    trpc.updateTask.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getTasks.queryKey(),
        });
        toast.success("Task updated!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update task");
      },
    })
  );

  const deleteTaskMutation = useMutation(
    trpc.deleteTask.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getTasks.queryKey(),
        });
        toast.success("Task deleted!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete task");
      },
    })
  );

  const handleStatusChange = (newStatus: "todo" | "in-progress" | "done") => {
    updateTaskMutation.mutate({
      authToken: token!,
      taskId: task.id,
      status: newStatus,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate({
        authToken: token!,
        taskId: task.id,
      });
    }
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority as keyof typeof priorityColors]}`}
        >
          {task.priority}
        </span>
        {task.estimatedHours && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.estimatedHours}h
          </span>
        )}
      </div>
      {task.assignedTo && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
          <User className="w-3 h-3" />
          {task.assignedTo.firstName} {task.assignedTo.lastName}
        </div>
      )}
      <select
        value={task.status}
        onChange={(e) =>
          handleStatusChange(e.target.value as "todo" | "in-progress" | "done")
        }
        className="w-full text-xs px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      >
        <option value="todo">To Do</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
      </select>
      <TaskCommentSection taskId={task.id} />
    </div>
  );
}
