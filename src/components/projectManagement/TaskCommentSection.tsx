import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { MessageCircle, Send } from "lucide-react";
import toast from "react-hot-toast";

export function TaskCommentSection({ taskId }: { taskId: number }) {
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const commentsQuery = useQuery(
    trpc.getTaskComments.queryOptions({
      authToken: token!,
      taskId,
    })
  );

  const createCommentMutation = useMutation(
    trpc.createTaskComment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getTaskComments.queryKey(),
        });
        setCommentText("");
        toast.success("Comment added!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add comment");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    createCommentMutation.mutate({
      authToken: token!,
      taskId,
      content: commentText.trim(),
    });
  };

  const comments = commentsQuery.data?.comments || [];
  const commentCount = comments.length;

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors w-full"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>
          {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Comments list */}
          {commentsQuery.isLoading ? (
            <div className="text-xs text-gray-500 text-center py-2">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-2">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="flex-shrink-0">
                    {comment.user.profilePhotoUrl ? (
                      <img
                        src={comment.user.profilePhotoUrl}
                        alt={`${comment.user.firstName} ${comment.user.lastName}`}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-700">
                        {comment.user.firstName[0]}
                        {comment.user.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-gray-900">
                        {comment.user.firstName} {comment.user.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5 break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-shrink-0">
              {currentUser?.profilePhotoUrl ? (
                <img
                  src={currentUser.profilePhotoUrl}
                  alt={`${currentUser.firstName} ${currentUser.lastName}`}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-700">
                  {currentUser?.firstName[0]}
                  {currentUser?.lastName[0]}
                </div>
              )}
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                disabled={createCommentMutation.isPending}
              />
              <button
                type="submit"
                disabled={createCommentMutation.isPending || !commentText.trim()}
                className="px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 self-end"
              >
                <Send className="w-3 h-3" />
                <span className="text-xs">
                  {createCommentMutation.isPending ? "Sending..." : "Send"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
