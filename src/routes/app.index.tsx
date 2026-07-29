import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useCrm, toggleFollowUp } from "@/lib/mock/store";
import { formatPrice } from "@/lib/mock/properties";
import { formatDistanceToNow, isToday, isPast, isFuture } from "date-fns";
import { CheckCircle2, Circle, AlertTriangle, TrendingUp, Home, Users, Calendar, MessageSquare, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const isHydrated = useCrm((s) => s.isHydrated);
  const props = useCrm((s) => s.properties);
  const leads = useCrm((s) => s.leads);
  const followUps = useCrm((s) => s.followUps);
  const activity = useCrm((s) => s.activity);

  if (!isHydrated) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-mono uppercase tracking-wider">Loading workspace…</p>
    </div>
  );

  const stats = useMemo(() => ({
    total: props.length,
    available: props.filter((p) => p.status === "Available").length,
    reserved: props.filter((p) => p.status === "Reserved").length,
    sold: props.filter((p) => p.status === "Sold").length,
    newLeads: leads.filter((l) => l.status === "New").length,
    todayFu: followUps.filter((f) => !f.done && isToday(new Date(f.scheduledAt))).length,
    siteVisits: leads.filter((l) => l.status === "Site Visit").length,
    closed: leads.filter((l) => l.status === "Closed Won").length,
    enquiries: leads.filter((l) => l.source === "Website").length,
  }), [props, leads, followUps]);

  const missed = followUps.filter((f) => !f.done && isPast(new Date(f.scheduledAt)) && !isToday(new Date(f.scheduledAt)));
  const today = followUps.filter((f) => !f.done && isToday(new Date(f.scheduledAt)));
  const upcoming = followUps.filter((f) => !f.done && isFuture(new Date(f.scheduledAt)) && !isToday(new Date(f.scheduledAt)));

  return (
    <div className="p-8 space-y-8">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Properties" value={stats.total} icon={Home} />
        <Stat label="Available" value={stats.available} tone="ok" />
        <Stat label="Reserved" value={stats.reserved} tone="warn" />
        <Stat label="Sold" value={stats.sold} tone="muted" />
        <Stat label="New Leads" value={stats.newLeads} icon={Users} tone="primary" />
        <Stat label="Today's Follow-ups" value={stats.todayFu} icon={Calendar} tone="primary" />
        <Stat label="Site Visits" value={stats.siteVisits} icon={TrendingUp} />
        <Stat label="Website Enquiries" value={stats.enquiries} icon={MessageSquare} />
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Missed" count={missed.length} tone="destructive">
          <FollowList items={missed} leads={leads} empty="No missed follow-ups." />
        </Panel>
        <Panel title="Today" count={today.length} tone="primary">
          <FollowList items={today} leads={leads} empty="Nothing scheduled for today." />
        </Panel>
        <Panel title="Upcoming" count={upcoming.length}>
          <FollowList items={upcoming} leads={leads} empty="No upcoming follow-ups." />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Recent Leads" count={leads.length}>
          <ul className="divide-y divide-border">
            {leads.slice(0, 6).map((l) => (
              <li key={l.id}>
                <Link to="/app/leads/$id" params={{ id: l.id }} className="flex items-center justify-between gap-4 py-3 px-1 hover:bg-secondary/40">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{l.name} <span className="text-muted-foreground font-normal">· {l.kind}</span></p>
                    <p className="text-[11px] text-muted-foreground truncate">{l.phone} · {l.source}</p>
                  </div>
                  <StatusPill status={l.status} />
                </Link>
              </li>
            ))}
            {leads.length === 0 && <li className="py-6 text-sm text-muted-foreground">No leads yet.</li>}
          </ul>
        </Panel>

        <Panel title="Recent Activity" count={activity.length}>
          <ul className="space-y-3">
            {activity.slice(0, 8).map((a) => (
              <li key={a.id} className="text-sm flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <div className="min-w-0">
                  <p className="truncate"><span className="font-medium">{a.actor}</span> {a.text}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Featured Properties" count={props.filter((p) => p.featured).length}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {props.filter((p) => p.featured).slice(0, 4).map((p) => (
            <Link key={p.id} to="/app/properties/$id" params={{ id: p.id }} className="group block">
              <div className="aspect-[4/3] bg-secondary overflow-hidden">
                {p.images[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
              </div>
              <p className="mt-2 text-sm font-medium truncate">{p.title}</p>
              <p className="text-[11px] text-muted-foreground">{p.city} · {formatPrice(p)}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon?: typeof Home; tone?: "ok" | "warn" | "muted" | "primary" | "destructive" }) {
  const toneCls = tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "primary" ? "text-primary" : tone === "destructive" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className={"font-display text-3xl font-black tracking-tighter " + toneCls}>{value}</p>
    </div>
  );
}

function Panel({ title, count, children, tone }: { title: string; count?: number; children: React.ReactNode; tone?: "primary" | "destructive" }) {
  const toneCls = tone === "primary" ? "text-primary" : tone === "destructive" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.25em]">{title}</h3>
        {count !== undefined && <span className={"font-mono text-xs " + toneCls}>{count}</span>}
      </div>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = status === "New" ? "bg-primary/10 text-primary" :
    status === "Closed Won" ? "bg-emerald-100 text-emerald-800" :
    status === "Closed Lost" ? "bg-secondary text-muted-foreground" :
    "bg-secondary text-foreground";
  return <span className={"text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 " + c}>{status}</span>;
}

function FollowList({ items, leads, empty }: { items: { id: string; leadId: string; action: string; scheduledAt: string; notes?: string }[]; leads: { id: string; name: string }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground py-4">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.slice(0, 5).map((f) => {
        const lead = leads.find((l) => l.id === f.leadId);
        return (
          <li key={f.id} className="flex items-start gap-3 group">
            <button
              onClick={() => toggleFollowUp(f.id)}
              className="mt-0.5 text-muted-foreground hover:text-emerald-600 transition-colors"
              title="Mark completed"
            >
              {isPast(new Date(f.scheduledAt)) && !isToday(new Date(f.scheduledAt))
                ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                : <Circle className="h-4 w-4 shrink-0 group-hover:hidden" />}
              <CheckCircle2 className="h-4 w-4 shrink-0 hidden group-hover:block text-emerald-600" />
            </button>
            <div className="min-w-0 flex-1">
              <Link to="/app/leads/$id" params={{ id: f.leadId }} className="text-sm font-medium hover:text-primary block truncate">
                {lead?.name ?? "Unknown"} · {f.action}
              </Link>
              <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(f.scheduledAt), { addSuffix: true })}</p>
              {f.notes && <p className="text-[11px] text-muted-foreground truncate">{f.notes}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// keep import used
void CheckCircle2;
