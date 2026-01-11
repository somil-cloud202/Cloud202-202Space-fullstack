import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { NotificationPanel } from "~/components/NotificationPanel";
import { AIChatAssistant } from "~/components/AIChatAssistant";
import {
  LayoutDashboard,
  User,
  Clock,
  Calendar,
  FileText,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  ClipboardCheck,
  Shield,
  BarChart3,
  Briefcase,
  Sparkles,
} from "lucide-react";

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const router = useRouterState();
  const trpc = useTRPC();

  const unreadCountQuery = useQuery(
    trpc.getUnreadCount.queryOptions({
      authToken: token!,
    })
  );

  const unreadCount = unreadCountQuery.data?.count || 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [notificationsOpen]);

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/login" });
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: Briefcase },
    ...(user?.role === "admin"
      ? [
          { name: "Admin Dashboard", href: "/admin", icon: Shield },
          { name: "  → Employees", href: "/admin/employees", icon: User },
          { name: "  → Projects", href: "/admin/projects", icon: FileText },
          { name: "  → Holidays", href: "/admin/holidays", icon: Calendar },
          { name: "  → Time Entries", href: "/admin/tasks", icon: Clock },
          { name: "  → Reports & Analytics", href: "/admin/reporting", icon: BarChart3 },
        ]
      : []),
    ...(user?.role === "manager" || user?.role === "admin"
      ? [{ name: "Manager Dashboard", href: "/manager/approvals", icon: ClipboardCheck }]
      : []),
    { name: "My Profile", href: "/profile", icon: User },
    { name: "Timesheet", href: "/timesheet", icon: Clock },
    { name: "Leaves", href: "/leaves", icon: Calendar },
    { name: "Documents", href: "/documents", icon: FileText },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return router.location.pathname === "/";
    }
    return router.location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-gray-950 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 py-6">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              202 Space
            </h1>
          </div>
          <nav className="flex-1 px-4 pb-4 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    active
                      ? "bg-white text-gray-950 shadow-lg"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      active ? "text-gray-950" : "text-gray-400"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-gray-950">
            <div className="flex items-center justify-between px-6 py-6">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                202 Space
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 pb-4 space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                      active
                        ? "bg-white text-gray-950 shadow-lg"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        active ? "text-gray-950" : "text-gray-400"
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top header */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow-md border-b border-gray-200">
          <button
            type="button"
            className="px-4 text-gray-500 focus:outline-none lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1" />

            <div className="ml-4 flex items-center gap-4">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 text-gray-400 hover:text-gray-500 relative"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-950 text-xs font-semibold text-white ring-2 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <NotificationPanel onClose={() => setNotificationsOpen(false)} />
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-700">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.designation || user?.role}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileOpen(false)}
                      >
                        My Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="inline h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>

        {/* AI Assistant Button */}
        {!aiChatOpen && (
          <button
            onClick={() => setAiChatOpen(true)}
            className="fixed bottom-4 right-4 w-14 h-14 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group z-40"
            title="AI Assistant"
          >
            <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* AI Chat Assistant */}
        {aiChatOpen && <AIChatAssistant onClose={() => setAiChatOpen(false)} />}
      </div>
    </div>
  );
}
