import { createFileRoute, Link } from "@tanstack/react-router";
import { markAllRead, markRead, useCrm } from "@/lib/mock/store";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const items = useCrm((s) => s.notifications);
  return (
    <div className="p-8 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-black tracking-tighter">Notifications</h1>
        <button onClick={markAllRead} className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest hover:text-primary"><CheckCheck className="h-4 w-4" /> Mark all read</button>
      </div>
      <ul className="divide-y divide-border border border-border bg-card">
        {items.map((n) => {
          const body = (
            <div className={"flex items-start gap-3 px-4 py-3 " + (n.read ? "" : "bg-primary/5")}>
              <Bell className={"h-4 w-4 mt-0.5 " + (n.read ? "text-muted-foreground" : "text-primary")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-[12px] text-muted-foreground">{n.body}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.at), { addSuffix: true })}</p>
              </div>
            </div>
          );
          return (
            <li key={n.id} onClick={() => markRead(n.id)}>
              {n.href ? <Link to={n.href as "/app"} className="block hover:bg-secondary/40">{body}</Link> : body}
            </li>
          );
        })}
        {items.length === 0 && <li className="px-4 py-8 text-sm text-muted-foreground text-center">No notifications.</li>}
      </ul>
    </div>
  );
}
