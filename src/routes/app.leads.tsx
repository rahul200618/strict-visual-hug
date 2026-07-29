import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { createLead, deleteLead, updateLead, useCrm, type LeadPriority, type LeadSource, type LeadStatus, type LeadKind, type CrmLead } from "@/lib/mock/store";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2, LayoutGrid, List, Phone, Mail, User, MoveRight, Download, Upload, Loader2 } from "lucide-react";
import { exportLeadsToCsv, parseAndImportLeadsCsv } from "@/lib/csv";


const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Site Visit", "Negotiation", "Closed Won", "Closed Lost"];
const SOURCES: LeadSource[] = ["Website", "Referral", "Walk-in", "Portal", "Campaign", "Other"];
const PRIORITIES: LeadPriority[] = ["Hot", "Warm", "Cold"];
const KINDS: LeadKind[] = ["Buyer", "Seller"];

export const Route = createFileRoute("/app/leads")({
  head: () => ({ meta: [{ title: "Leads — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const isHydrated = useCrm((s) => s.isHydrated);
  const leads = useCrm((s) => s.leads);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [f, setF] = useState<{ status?: string; source?: string; kind?: string; priority?: string; q?: string }>({});
  const [creating, setCreating] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  if (!isHydrated) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-mono uppercase tracking-wider">Loading leads…</p>
    </div>
  );

  const filtered = useMemo(() => leads.filter((l) => {
    if (f.status && l.status !== f.status) return false;
    if (f.source && l.source !== f.source) return false;
    if (f.kind && l.kind !== f.kind) return false;
    if (f.priority && l.priority !== f.priority) return false;
    if (f.q) {
      const t = f.q.toLowerCase();
      if (![l.name, l.phone, l.email, l.location].filter(Boolean).some((v) => v!.toLowerCase().includes(t))) return false;
    }
    return true;
  }), [leads, f]);

  const handleDropStatus = (newStatus: LeadStatus) => {
    if (draggedLeadId) {
      updateLead(draggedLeadId, { status: newStatus });
      setDraggedLeadId(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Search name, phone, email…"
          value={f.q ?? ""}
          onChange={(e) => setF({ ...f, q: e.target.value || undefined })}
          className="bg-card border border-border px-3 py-2 text-sm w-72 outline-none focus:ring-2 focus:ring-primary"
        />
        <FilterSelect value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={KINDS} label="All types" />
        <FilterSelect value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUSES} label="All statuses" />
        <FilterSelect value={f.source} onChange={(v) => setF({ ...f, source: v })} options={SOURCES} label="All sources" />
        <FilterSelect value={f.priority} onChange={(v) => setF({ ...f, priority: v })} options={PRIORITIES} label="All priorities" />

        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex items-center border border-border bg-card p-0.5 rounded">
          <button
            onClick={() => setViewMode("kanban")}
            className={[
              "flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors",
              viewMode === "kanban" ? "bg-foreground text-background font-bold" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={[
              "flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors",
              viewMode === "table" ? "bg-foreground text-background font-bold" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <List className="h-3.5 w-3.5" /> Table
          </button>
        </div>

        {/* CSV Export & Import */}
        <button
          onClick={() => exportLeadsToCsv(filtered)}
          className="flex items-center gap-1.5 border border-border bg-card px-3 py-2 text-xs font-mono uppercase tracking-wider hover:border-primary transition-colors"
          title="Export filtered leads to CSV"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>

        <label className="flex items-center gap-1.5 border border-border bg-card px-3 py-2 text-xs font-mono uppercase tracking-wider hover:border-primary transition-colors cursor-pointer">
          <Upload className="h-3.5 w-3.5" /> Import CSV
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (evt) => {
                const text = evt.target?.result as string;
                if (text) {
                  const res = parseAndImportLeadsCsv(text);
                  alert(`Import complete! ${res.importedCount} leads imported.${res.errors.length ? "\nWarnings:\n" + res.errors.slice(0, 5).join("\n") : ""}`);
                }
              };
              reader.readAsText(file);
              e.target.value = "";
            }}
          />
        </label>

        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New Lead
        </button>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-220px)] scrollbar-thin">
          {STATUSES.map((status) => {
            const statusLeads = filtered.filter((l) => l.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropStatus(status)}
                className="w-80 shrink-0 bg-card/60 border border-border rounded flex flex-col max-h-[calc(100vh-220px)]"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <span className={"h-2 w-2 rounded-full " + getStatusDotColor(status)} />
                    <h3 className="font-mono text-xs uppercase tracking-wider font-bold">{status}</h3>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {statusLeads.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto min-h-[150px]">
                  {statusLeads.map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      onDragStart={() => setDraggedLeadId(lead.id)}
                    />
                  ))}
                  {statusLeads.length === 0 && (
                    <div className="h-24 border border-dashed border-border rounded flex items-center justify-center text-xs font-mono text-muted-foreground">
                      Drag leads here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-card border border-border overflow-hidden rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <Link to="/app/leads/$id" params={{ id: l.id }} className="font-medium hover:text-primary">{l.name}</Link>
                    {l.location && <p className="text-[11px] text-muted-foreground">{l.location}</p>}
                  </td>
                  <td className="px-4 py-3">{l.kind}</td>
                  <td className="px-4 py-3"><p>{l.phone}</p>{l.email && <p className="text-[11px] text-muted-foreground">{l.email}</p>}</td>
                  <td className="px-4 py-3">{l.source}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.priority}
                      onChange={(e) => updateLead(l.id, { priority: e.target.value as LeadPriority })}
                      className="bg-transparent text-xs outline-none cursor-pointer"
                    >
                      {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => updateLead(l.id, { status: e.target.value as LeadStatus })}
                      className="bg-secondary text-xs px-2 py-1 outline-none cursor-pointer rounded"
                    >
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm("Delete lead?")) deleteLead(l.id); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">No leads match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && <NewLeadDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function KanbanCard({ lead, onDragStart }: { lead: CrmLead; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-card border border-border p-3.5 rounded shadow-sm hover:border-primary/60 transition-all cursor-grab active:cursor-grabbing group space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <Link to="/app/leads/$id" params={{ id: lead.id }} className="font-semibold text-sm hover:text-primary truncate block">
          {lead.name}
        </Link>
        <span className={"text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 " + getPriorityBadge(lead.priority)}>
          {lead.priority}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-1.5 truncate">
          <Phone className="h-3 w-3 shrink-0" /> {lead.phone}
        </p>
        {lead.email && (
          <p className="flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 shrink-0" /> {lead.email}
          </p>
        )}
        {lead.location && (
          <p className="text-[11px] truncate text-foreground/80 font-mono">
            📍 {lead.location}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">{lead.kind} · {lead.source}</span>
        <div className="flex items-center gap-1">
          <select
            value={lead.status}
            onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
            className="bg-secondary text-[10px] font-mono px-1 py-0.5 outline-none rounded cursor-pointer text-foreground"
          >
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button
            onClick={() => { if (confirm("Delete lead?")) deleteLead(lead.id); }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            title="Delete Lead"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusDotColor(status: LeadStatus): string {
  switch (status) {
    case "New": return "bg-primary";
    case "Contacted": return "bg-blue-500";
    case "Qualified": return "bg-indigo-500";
    case "Site Visit": return "bg-purple-500";
    case "Negotiation": return "bg-amber-500";
    case "Closed Won": return "bg-emerald-500";
    case "Closed Lost": return "bg-muted-foreground";
    default: return "bg-foreground";
  }
}

function getPriorityBadge(priority: LeadPriority): string {
  switch (priority) {
    case "Hot": return "bg-destructive/10 text-destructive border border-destructive/20";
    case "Warm": return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
    case "Cold": return "bg-secondary text-muted-foreground";
  }
}

function FilterSelect({ value, onChange, options, label }: { value?: string; onChange: (v?: string) => void; options: readonly string[]; label: string }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}
      className="bg-card border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function NewLeadDialog({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ kind: "Buyer" as LeadKind, name: "", phone: "", email: "", source: "Website" as LeadSource, priority: "Warm" as LeadPriority, location: "", propertyType: "", expectedPrice: "", message: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name || !f.phone) return;
    createLead(f);
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-card w-full max-w-lg border border-border p-6 space-y-4 max-h-[90vh] overflow-auto">
        <h2 className="font-display text-2xl font-black tracking-tighter">New lead</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as LeadKind })} className="bg-secondary px-3 py-2 text-sm w-full">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Source"><select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as LeadSource })} className="bg-secondary px-3 py-2 text-sm w-full">{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Full name" full><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Field>
          <Field label="Phone"><input required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Field>
          <Field label="Email"><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Field>
          <Field label="Priority"><select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as LeadPriority })} className="bg-secondary px-3 py-2 text-sm w-full">{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          {f.kind === "Seller" ? (
            <>
              <Field label="Location"><input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Field>
              <Field label="Property type"><input value={f.propertyType} onChange={(e) => setF({ ...f, propertyType: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Field>
              <Field label="Expected price"><input value={f.expectedPrice} onChange={(e) => setF({ ...f, expectedPrice: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Field>
            </>
          ) : null}
          <Field label="Message" full><textarea rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-border">Cancel</button>
          <button type="submit" className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground">Create</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={"block " + (full ? "col-span-2" : "")}>
      <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
