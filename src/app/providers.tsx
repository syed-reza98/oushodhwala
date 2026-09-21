"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { LangProvider } from "@/lib/lang";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <LangProvider>
          <StoreProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </StoreProvider>
        </LangProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
