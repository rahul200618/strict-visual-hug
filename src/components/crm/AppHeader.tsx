import { useCrm } from "@/lib/mock/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Link, useRouterState } from "@tanstack/react-router";
import { Database, Search } from "lucide-react";
import { useMemo, useState } from "react";

export function AppHeader() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [q, setQ] = useState("");
  const leads = useCrm((s) => s.leads);
  const properties = useCrm((s) => s.properties);

  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const t = q.toLowerCase();
    const l = leads
      .filter((x) => [x.name, x.phone, x.email, x.location].filter(Boolean).some((v) => v!.toLowerCase().includes(t)))
      .slice(0, 5)
      .map((x) => ({ id: x.id, label: `${x.name} · ${x.phone}`, kind: "Lead", href: `/app/leads/${x.id}` }));
    const p = properties
      .filter((x) => [x.title, x.location, x.city, x.id, x.ownerName].some((v) => v.toLowerCase().includes(t)))
      .slice(0, 5)
      .map((x) => ({ id: x.id, label: `${x.title} · ${x.city}`, kind: "Property", href: `/app/properties/${x.id}` }));
    return [...l, ...p];
  }, [q, leads, properties]);

  const title = pathname === "/app" ? "Dashboard" :
    pathname.startsWith("/app/leads") ? "Leads" :
    pathname.startsWith("/app/properties") ? "Properties" :
    pathname.startsWith("/app/website") ? "Website" :
    pathname.startsWith("/app/reports") ? "Reports" :
    pathname.startsWith("/app/notifications") ? "Notifications" :
    pathname.startsWith("/app/activity") ? "Activity" : "";

  return (
    <header className="border-b border-border bg-card">
      <div className="px-8 h-16 flex items-center gap-4">
        <h1 className="font-display font-black tracking-tighter text-lg flex-1">{title}</h1>
        
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-[11px] font-mono rounded">
          <Database className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-muted-foreground hidden sm:inline">
            Skyward Properties Database
          </span>
        </div>

        <div className="relative w-80 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search owner, customer, phone, property ID…"
            className="w-full bg-secondary pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border shadow-lg z-50 max-h-80 overflow-auto">
              {results.map((r) => (
                <Link
                  key={r.kind + r.id}
                  to={r.href}
                  onClick={() => setQ("")}
                  className="flex items-center justify-between gap-4 px-3 py-2 text-sm hover:bg-secondary"
                >
                  <span className="truncate">{r.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.kind}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

