import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { deleteProperty, upsertProperty, useCrm, type CrmProperty } from "@/lib/mock/store";
import { formatPrice, type PropertyStatus, type PropertyType } from "@/lib/mock/properties";
import { Plus, Trash2, Eye, EyeOff, Star, Download, Loader2 } from "lucide-react";
import { exportPropertiesToCsv } from "@/lib/csv";


const TYPES: PropertyType[] = ["Villa", "Apartment", "Cabin", "Penthouse", "House"];
const STATUSES: PropertyStatus[] = ["Available", "Reserved", "Sold"];

export const Route = createFileRoute("/app/properties")({
  head: () => ({ meta: [{ title: "Properties — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PropertiesPage,
});

function PropertiesPage() {
  const isHydrated = useCrm((s) => s.isHydrated);
  const props = useCrm((s) => s.properties);
  const [f, setF] = useState<{ q?: string; type?: string; status?: string; published?: string }>({});

  if (!isHydrated) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-mono uppercase tracking-wider">Loading properties…</p>
    </div>
  );

  const filtered = useMemo(() => props.filter((p) => {
    if (f.type && p.type !== f.type) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.published === "yes" && !p.published) return false;
    if (f.published === "no" && p.published) return false;
    if (f.q) {
      const t = f.q.toLowerCase();
      if (![p.title, p.location, p.city, p.id, p.ownerName].some((v) => v.toLowerCase().includes(t))) return false;
    }
    return true;
  }), [props, f]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input value={f.q ?? ""} onChange={(e) => setF({ ...f, q: e.target.value || undefined })} placeholder="Search title, location, owner, ID…"
          className="bg-card border border-border px-3 py-2 text-sm w-72 outline-none focus:ring-2 focus:ring-primary" />
        <Sel value={f.type} onChange={(v) => setF({ ...f, type: v })} options={TYPES} label="All types" />
        <Sel value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUSES} label="All statuses" />
        <Sel value={f.published} onChange={(v) => setF({ ...f, published: v })} options={["yes", "no"]} label="Published?" render={(v) => v === "yes" ? "Published" : "Unpublished"} />
        <div className="flex-1" />
        <button
          onClick={() => exportPropertiesToCsv(filtered)}
          className="flex items-center gap-1.5 border border-border bg-card px-3 py-2 text-xs font-mono uppercase tracking-wider hover:border-primary transition-colors"
          title="Export filtered properties to CSV"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <Link to="/app/properties/$id" params={{ id: "new" }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90">
          <Plus className="h-4 w-4" /> New Property
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => <Card key={p.id} p={p} />)}
        {filtered.length === 0 && <div className="col-span-full py-16 text-center text-sm text-muted-foreground border border-border">No properties match.</div>}
      </div>
    </div>
  );
}

function Card({ p }: { p: CrmProperty }) {
  return (
    <div className="bg-card border border-border overflow-hidden group">
      <Link to="/app/properties/$id" params={{ id: p.id }} className="block relative aspect-[4/3] bg-secondary">
        {p.images[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={"text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 " + (p.published ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground")}>
            {p.published ? <Eye className="inline h-3 w-3" /> : <EyeOff className="inline h-3 w-3" />} {p.published ? "Live" : "Draft"}
          </span>
          {p.featured && <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-primary text-primary-foreground"><Star className="inline h-3 w-3" /> Featured</span>}
        </div>
      </Link>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to="/app/properties/$id" params={{ id: p.id }} className="font-medium truncate block hover:text-primary">{p.title || "Untitled"}</Link>
            <p className="text-[11px] text-muted-foreground truncate">{p.city} · {p.type}</p>
          </div>
          <button onClick={() => { if (confirm("Delete property?")) deleteProperty(p.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-display font-black tracking-tighter text-lg">{formatPrice(p)}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{p.status}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={() => upsertProperty({ ...p, published: !p.published })} className="flex-1 text-[10px] font-mono uppercase tracking-wider py-1 border border-border hover:border-primary">
            {p.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Sel({ value, onChange, options, label, render }: { value?: string; onChange: (v?: string) => void; options: readonly string[]; label: string; render?: (v: string) => string }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className="bg-card border border-border px-3 py-2 text-sm outline-none">
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{render ? render(o) : o}</option>)}
    </select>
  );
}
