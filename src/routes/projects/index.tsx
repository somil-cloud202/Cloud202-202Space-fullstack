import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Layout } from "~/components/Layout";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { 
  Briefcase, 
  Calendar, 
  Users, 
  Clock,
  ChevronRight,
  FolderKanban,
} from "lucide-react";

export const Route = createFileRoute("/projects/")({
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
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const trpc = useTRPC();

  const projectsQuery = useQuery(
    trpc.getMyProjects.queryOptions({
      authToken: token!,
    })
  );

  if (projectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const projects = projectsQuery.data?.projects || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === "admin" || user?.role === "manager"
              ? "All projects in the organization"
              : "Projects you're assigned to"}
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Projects Yet
          </h3>
          <p className="text-gray-600">
            {user?.role === "admin"
              ? "Create your first project to get started."
              : "You haven't been assigned to any projects yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to="/projects/$projectId/kanban"
              params={{ projectId: project.id.toString() }}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {project.name}
                  </h3>
                  {project.client && (
                    <p className="text-sm text-gray-600">{project.client}</p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    project.status === "active"
                      ? "bg-green-100 text-green-800"
                      : project.status === "completed"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {project.status}
                </span>
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{project._count.assignments} members</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FolderKanban className="w-4 h-4" />
                  <span>{project._count.tasks} tasks</span>
                </div>
              </div>

              {project.startDate && project.endDate && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(project.startDate).toLocaleDateString()} -{" "}
                    {new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-900">
                  View Kanban Board
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
