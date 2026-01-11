import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "~/stores/authStore";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate({ to: "/login" });
    }
  }, [token, navigate]);

  if (!token) {
    return null;
  }

  return <>{children}</>;
}
