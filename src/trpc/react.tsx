import { QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  splitLink,
  httpBatchStreamLink,
  httpSubscriptionLink,
  createTRPCClient,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";
import { TRPC_URL } from "~/config/api";

// Now, with the newer @trpc/tanstack-react-query package, we no longer need createTRPCReact.
// We use createTRPCContext instead.
const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export { useTRPC, useTRPCClient };

function getBaseUrl() {
  // Use the configured TRPC URL from our API config
  if (typeof window !== "undefined") {
    // In browser, use the configured TRPC URL or fallback to current origin
    return TRPC_URL || window.location.origin + "/trpc";
  }
  // Server-side fallback
  return TRPC_URL || "http://localhost:3000/trpc";
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        splitLink({
          condition: (op) => op.type === "subscription",
          false: httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl(),
          }),
          true: httpSubscriptionLink({
            transformer: SuperJSON,
            url: getBaseUrl(),
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
