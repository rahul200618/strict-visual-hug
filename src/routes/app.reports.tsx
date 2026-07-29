import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useCrm } from "@/lib/mock/store";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatDistanceToNow } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--foreground))", "hsl(var(--muted-foreground))", "#a3a3a3", "#8b8b8b"];

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const leads = useCrm((s) => s.leads);
  const props = useCrm((s) => s.properties);
  const followUps = useCrm((s) => s.followUps);

  const bySource = useMemo(() => tally(leads, (l) => l.source), [leads]);
  const byStatus = useMemo(() => tally(leads, (l) => l.status), [leads]);
  const propByStatus = useMemo(() => tally(props, (p) => p.status), [props]);
  const propByType = useMemo(() => tally(props, (p) => p.type), [props]);
  const fuByAction = useMemo(() => tally(followUps, (f) => f.action), [followUps]);

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-4xl font-black tracking-tighter">Reports</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <Chart title="Leads by source"><BarChart data={bySource}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" /></BarChart></Chart>
        <Chart title="Leads by status"><BarChart data={byStatus}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--foreground))" /></BarChart></Chart>
        <Chart title="Properties by status">
          <PieChart>
            <Pie data={propByStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
              {propByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend /><Tooltip />
          </PieChart>
        </Chart>
        <Chart title="Properties by type"><BarChart data={propByType}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" /></BarChart></Chart>
        <Chart title="Follow-ups by action" wide><BarChart data={fuByAction}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--foreground))" /></BarChart></Chart>
      </div>

      <section className="bg-card border border-border p-5">
        <h3 className="font-mono text-xs uppercase tracking-[0.25em] mb-4">Website enquiries</h3>
        <ul className="divide-y divide-border">
          {leads.filter((l) => l.source === "Website").slice(0, 10).map((l) => (
            <li key={l.id} className="py-2.5 flex items-center justify-between text-sm">
              <span>{l.name} <span className="text-muted-foreground">· {l.kind}</span></span>
              <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</span>
            </li>
          ))}
          {leads.filter((l) => l.source === "Website").length === 0 && <li className="py-4 text-sm text-muted-foreground">No website enquiries yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function Chart({ title, children, wide }: { title: string; children: React.ReactElement; wide?: boolean }) {
  return (
    <div className={"bg-card border border-border p-4 " + (wide ? "lg:col-span-2" : "")}>
      <h3 className="font-mono text-xs uppercase tracking-[0.25em] mb-3">{title}</h3>
      <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}

function tally<T>(arr: T[], key: (t: T) => string): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const it of arr) m.set(key(it), (m.get(key(it)) ?? 0) + 1);
  return Array.from(m, ([name, value]) => ({ name, value }));
}
