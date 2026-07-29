import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/crm/AppSidebar";
import { AppHeader } from "@/components/crm/AppHeader";
import { useCrm } from "@/lib/mock/store";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "CRM — Skyward Properties" },
      { name: "description", content: "Internal CRM for Skyward Properties partners." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const user = useCrm((s) => s.user);
  const isHydrated = useCrm((s) => s.isHydrated);
  const navigate = useNavigate();
  const isLogin = pathname === "/app/login";

  // Only redirect after we've checked auth (isHydrated = session restore complete)
  useEffect(() => {
    if (!isHydrated) return;
    if (!isLogin && !user) navigate({ to: "/app/login", replace: true });
  }, [isHydrated, isLogin, user, navigate]);

  // Login page renders standalone (no sidebar/header)
  if (isLogin) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  // Show global loading while session + data is being fetched
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-mono uppercase tracking-widest">Starting workspace…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />
        <main className="flex-1 min-w-0 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
