import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "react-hot-toast";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });

  if (isFetching) {
    return <div>Loading...</div>;
  }

  return (
    <TRPCReactProvider>
      <Toaster position="top-right" />
      <Outlet />
    </TRPCReactProvider>
  );
}
