import { createFileRoute } from "@tanstack/react-router";
import { useCrm } from "@/lib/mock/store";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/activity")({
  head: () => ({ meta: [{ title: "Activity — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const items = useCrm((s) => s.activity);
  return (
    <div className="p-8 space-y-4 max-w-3xl">
      <h1 className="font-display text-4xl font-black tracking-tighter">Activity log</h1>
      <ol className="border-l-2 border-border pl-5 space-y-4">
        {items.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm"><span className="font-medium">{a.actor}</span> {a.text}</p>
            <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</p>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
      </ol>
    </div>
  );
}
