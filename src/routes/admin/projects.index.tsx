import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { CreateProjectForm } from "~/components/admin/CreateProjectForm";
import { AssignProjectForm } from "~/components/admin/AssignProjectForm";
import { FolderOpen, Search, Edit, Trash2, Shield, Users, Clock, Target } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/admin/projects/")({
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <ProjectsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function ProjectsContent() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "on-hold">("all");

  const projectsQuery = useQuery(
    trpc.getAllProjects.queryOptions({
      authToken: token!,
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteProject.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getAllProjects.queryKey(),
        });
        toast.success("Project deleted successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete project");
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

  if (projectsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (projectsQuery.isError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FolderOpen className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Projects</h2>
        <p className="text-gray-600">Failed to load project data. Please try again.</p>
      </div>
    );
  }

  const allProjects = projectsQuery.data.projects;
  
  // Filter projects based on search and status
  const filteredProjects = allProjects.filter((project) => {
    const matchesSearch =
      searchTerm === "" ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (projectId: number, projectName: string) => {
    if (confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      deleteMutation.mutate({
        authToken: token!,
        projectId,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
          <p className="text-gray-600 mt-1">Manage all projects in your organization</p>
        </div>
        <Link
          to="/admin"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Create New Project Form */}
      <CreateProjectForm />

      {/* Assign Project to Employee Form */}
      <AssignProjectForm />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Projects</p>
              <p className="text-3xl font-bold mt-1">{allProjects.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 text-gray-900 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active</p>
              <p className="text-3xl font-bold mt-1">
                {allProjects.filter((p) => p.status === "active").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-800" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 text-gray-900 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-3xl font-bold mt-1">
                {allProjects.filter((p) => p.status === "completed").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-gray-800" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 text-gray-900 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">On Hold</p>
              <p className="text-3xl font-bold mt-1">
                {allProjects.filter((p) => p.status === "on-hold").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-gray-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by project name or client..."
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
            <option value="active">Active Only</option>
            <option value="completed">Completed Only</option>
            <option value="on-hold">On Hold Only</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Entries
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget Hours
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
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No projects found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-white font-semibold">
                          {project.name[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                          {project.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.client || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        {project._count.assignments}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {project._count.timeEntries}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.budgetHours ? `${project.budgetHours}h` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === "active"
                            ? "bg-gray-900 text-white"
                            : project.status === "completed"
                              ? "bg-gray-700 text-white"
                              : "bg-gray-300 text-gray-800"
                        }`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to="/admin/projects/$projectId/sprints"
                          params={{ projectId: project.id.toString() }}
                          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                        >
                          <Target className="w-4 h-4" />
                          Sprints
                        </Link>
                        <Link
                          to="/admin/projects/$projectId/edit"
                          params={{ projectId: project.id.toString() }}
                          className="text-gray-900 hover:text-gray-700 inline-flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(project.id, project.name)}
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
