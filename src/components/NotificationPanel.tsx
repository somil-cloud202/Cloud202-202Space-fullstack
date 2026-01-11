import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { X, Check, Bell } from "lucide-react";

type NotificationPanelProps = {
  onClose: () => void;
};

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  const notificationsQuery = useQuery(
    trpc.getNotifications.queryOptions({
      authToken: token!,
    })
  );

  const markAsReadMutation = useMutation(
    trpc.markAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getNotifications.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getUnreadCount.queryKey(),
        });
      },
    })
  );

  const notifications = notificationsQuery.data?.notifications || [];

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({
      authToken: token!,
      notificationId,
    });
  };

  const handleMarkAllAsRead = () => {
    markAsReadMutation.mutate({
      authToken: token!,
      markAll: true,
    });
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markAsReadMutation.isPending}
              className="text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notificationsQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                !notification.isRead ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-gray-950 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={markAsReadMutation.isPending}
                    className="p-1 text-gray-700 hover:text-gray-900 disabled:opacity-50"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
