import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Home, BarChart3, Bell, Activity,
  LogOut,
} from "lucide-react";
import { logout, switchRole, useCrm, type Role } from "@/lib/mock/store";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; adminOnly?: boolean };
const items: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/properties", label: "Properties", icon: Home },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/activity", label: "Activity", icon: Activity, adminOnly: true },
];

export function AppSidebar() {
  const user = useCrm((s) => s.user);
  const unread = useCrm((s) => s.notifications.filter((n) => !n.read).length);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col h-full overflow-y-auto">
      <Link to="/app" className="px-6 py-5 border-b border-border flex flex-col gap-0.5">
        <span className="font-display font-black tracking-tighter text-xl leading-none">Skyward</span>
        <span className="font-display font-black tracking-tighter text-xl text-primary leading-none">Properties</span>
      </Link>

      <nav className="flex-1 py-4">
        {items.map((it) => {
          if (it.adminOnly && user?.role !== "admin") return null;
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to as "/app"}
              className={[
                "flex items-center gap-3 px-6 py-2.5 text-sm transition-colors",
                active ? "bg-secondary text-foreground border-l-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{it.label}</span>
              {it.to === "/app/notifications" && unread > 0 && (
                <span className="text-[10px] font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded">{unread}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 space-y-3">
        {user && (
          <div>
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-1">
              {(["admin", "sales"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={[
                    "flex-1 text-[10px] font-mono uppercase tracking-wider py-1 border transition-colors",
                    user.role === r ? "bg-foreground text-background border-foreground" : "border-border hover:border-primary",
                  ].join(" ")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
        {user && (
          <Link to="/app/login" onClick={() => logout()} className="w-full flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-destructive">
            <LogOut className="h-3 w-3" /> Sign out
          </Link>
        )}
      </div>
    </aside>
  );
}
