import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { addInteraction, createFollowUp, deleteFollowUp, deleteLead, toggleFollowUp, updateLead, useCrm, type Interaction, type LeadPriority, type LeadSource, type LeadStatus } from "@/lib/mock/store";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, CheckCircle2, Circle, Trash2, Sparkles, Building, Link2, CalendarPlus, Phone, Mail, MessageCircle } from "lucide-react";

import { matchPropertiesForLead } from "@/lib/matching";
import { formatPrice } from "@/lib/mock/properties";


const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Site Visit", "Negotiation", "Closed Won", "Closed Lost"];
const SOURCES: LeadSource[] = ["Website", "Referral", "Walk-in", "Portal", "Campaign", "Other"];
const PRIORITIES: LeadPriority[] = ["Hot", "Warm", "Cold"];
const ACTIONS: Interaction["kind"][] = ["Note", "Call", "Email", "Meeting"];

export const Route = createFileRoute("/app/leads/$id")({
  head: () => ({ meta: [{ title: "Lead — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const lead = useCrm((s) => s.leads.find((l) => l.id === id));
  const properties = useCrm((s) => s.properties);
  const followUps = useCrm((s) => s.followUps.filter((f) => f.leadId === id));
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [kind, setKind] = useState<Interaction["kind"]>("Note");
  const [fu, setFu] = useState({ scheduledAt: "", action: "Call" as "Call" | "Meeting" | "Site Visit" | "Email", notes: "" });

  const matchedProps = useMemo(() => lead ? matchPropertiesForLead(lead, properties) : [], [lead, properties]);

  if (!lead) return <div className="p-8">Lead not found. <Link to="/app/leads" className="text-primary underline">Back</Link></div>;

  const linkedProperty = lead.propertyId ? properties.find((p) => p.id === lead.propertyId) : undefined;

  function addInt(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    addInteraction(id, { kind, text: text.trim(), by: "You" });
    setText("");
  }
  function addFu(e: React.FormEvent) {
    e.preventDefault();
    if (!fu.scheduledAt) return;
    createFollowUp({ leadId: id, scheduledAt: new Date(fu.scheduledAt).toISOString(), action: fu.action, notes: fu.notes });
    setFu({ scheduledAt: "", action: "Call", notes: "" });
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <Link to="/app/leads" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" /> Back to leads</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-1">{lead.kind}</p>
          <h1 className="font-display text-4xl font-black tracking-tighter">{lead.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{lead.phone}{lead.email && ` · ${lead.email}`}</p>
        </div>

        <div className="flex items-center gap-2">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card text-xs font-mono uppercase tracking-wider hover:border-primary transition-colors"
              title="Call Lead"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-600" /> Call
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}?subject=Skyward Properties Property Enquiry`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card text-xs font-mono uppercase tracking-wider hover:border-primary transition-colors"
              title="Email Lead"
            >
              <Mail className="h-3.5 w-3.5 text-blue-600" /> Email
            </a>
          )}
          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card text-xs font-mono uppercase tracking-wider hover:border-emerald-600 transition-colors"
              title="WhatsApp Message"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp
            </a>
          )}
          <button onClick={() => { if (confirm("Delete this lead?")) { deleteLead(id); navigate({ to: "/app/leads" }); } }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-destructive border border-transparent">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <Editable label="Status">
          <select value={lead.status} onChange={(e) => updateLead(id, { status: e.target.value as LeadStatus })} className="bg-secondary px-3 py-2 text-sm w-full">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </Editable>
        <Editable label="Priority">
          <select value={lead.priority} onChange={(e) => updateLead(id, { priority: e.target.value as LeadPriority })} className="bg-secondary px-3 py-2 text-sm w-full">{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
        </Editable>
        <Editable label="Source">
          <select value={lead.source} onChange={(e) => updateLead(id, { source: e.target.value as LeadSource })} className="bg-secondary px-3 py-2 text-sm w-full">{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
        </Editable>
        <Editable label="Assignee">
          <input value={lead.assignee ?? ""} onChange={(e) => updateLead(id, { assignee: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" />
        </Editable>
        {lead.location !== undefined && (
          <Editable label="Location"><input value={lead.location ?? ""} onChange={(e) => updateLead(id, { location: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Editable>
        )}
        {lead.expectedPrice !== undefined && (
          <Editable label="Expected price"><input value={lead.expectedPrice ?? ""} onChange={(e) => updateLead(id, { expectedPrice: e.target.value })} className="bg-secondary px-3 py-2 text-sm w-full" /></Editable>
        )}
      </div>

      {lead.message && (
        <div className="bg-card border border-border p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Message</p>
          <p className="text-sm">{lead.message}</p>
        </div>
      )}

      {linkedProperty && (
        <div className="bg-card border border-border p-4 flex items-center gap-4">
          {linkedProperty.images[0] && <img src={linkedProperty.images[0]} alt="" className="w-20 h-16 object-cover" />}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Linked property</p>
            <Link to="/app/properties/$id" params={{ id: linkedProperty.id }} className="font-medium hover:text-primary">{linkedProperty.title}</Link>
            <p className="text-[11px] text-muted-foreground">{linkedProperty.city} · {linkedProperty.currency}{linkedProperty.price.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* SMART PROPERTY RECOMMENDATIONS */}
      <section className="bg-card border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-mono text-xs uppercase tracking-[0.25em]">Smart Property Recommendations</h3>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Auto-matched for this lead</span>
        </div>

        {matchedProps.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No matching properties found in inventory for this lead's budget/location criteria.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {matchedProps.slice(0, 4).map(({ property: p, score, reasons }) => (
              <div key={p.id} className="border border-border p-3 bg-secondary/30 rounded flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  {p.images[0] ? (
                    <img src={p.images[0]} alt={p.title} className="w-16 h-16 object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-secondary flex items-center justify-center rounded shrink-0">
                      <Building className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link to="/app/properties/$id" params={{ id: p.id }} className="font-semibold text-sm hover:text-primary truncate block">
                        {p.title}
                      </Link>
                      <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                        {score}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{p.city} · {p.type} · {formatPrice(p)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {reasons.map((r, idx) => (
                        <span key={idx} className="text-[9px] font-mono bg-background border border-border text-muted-foreground px-1 py-0.2 rounded">
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  {lead.propertyId !== p.id && (
                    <button
                      onClick={() => updateLead(lead.id, { propertyId: p.id })}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider py-1 border border-border hover:border-primary bg-card"
                    >
                      <Link2 className="h-3 w-3" /> Link Property
                    </button>
                  )}
                  <button
                    onClick={() => {
                      createFollowUp({
                        leadId: lead.id,
                        scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
                        action: "Site Visit",
                        notes: `Site visit for ${p.title} (${p.city})`,
                      });
                      alert(`Site visit scheduled for ${p.title}!`);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider py-1 bg-primary text-primary-foreground font-bold hover:opacity-90"
                  >
                    <CalendarPlus className="h-3 w-3" /> Book Visit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-card border border-border p-5">
          <h3 className="font-mono text-xs uppercase tracking-[0.25em] mb-4">Interaction timeline</h3>
          <form onSubmit={addInt} className="space-y-2 mb-4">
            <div className="flex gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value as Interaction["kind"])} className="bg-secondary px-2 py-2 text-sm">{ACTIONS.map((a) => <option key={a}>{a}</option>)}</select>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note or log a call…" className="flex-1 bg-secondary px-3 py-2 text-sm" />
              <button className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-foreground text-background">Add</button>
            </div>
          </form>
          <ul className="space-y-3">
            {lead.interactions.length === 0 && <li className="text-sm text-muted-foreground">No interactions yet.</li>}
            {lead.interactions.map((i) => (
              <li key={i.id} className="border-l-2 border-border pl-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{i.kind} · {formatDistanceToNow(new Date(i.at), { addSuffix: true })} · {i.by}</p>
                <p className="text-sm mt-0.5">{i.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card border border-border p-5">
          <h3 className="font-mono text-xs uppercase tracking-[0.25em] mb-4">Follow-ups</h3>
          <form onSubmit={addFu} className="space-y-2 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" required value={fu.scheduledAt} onChange={(e) => setFu({ ...fu, scheduledAt: e.target.value })} className="bg-secondary px-3 py-2 text-sm" />
              <select value={fu.action} onChange={(e) => setFu({ ...fu, action: e.target.value as typeof fu.action })} className="bg-secondary px-3 py-2 text-sm">
                {["Call", "Meeting", "Site Visit", "Email"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <input value={fu.notes} onChange={(e) => setFu({ ...fu, notes: e.target.value })} placeholder="Notes / next action" className="bg-secondary px-3 py-2 text-sm w-full" />
            <button className="w-full py-2 text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground">Schedule</button>
          </form>
          <ul className="space-y-2">
            {followUps.length === 0 && <li className="text-sm text-muted-foreground">No follow-ups scheduled.</li>}
            {followUps.map((f) => (
              <li key={f.id} className="flex items-start gap-3 border border-border p-2.5">
                <button onClick={() => toggleFollowUp(f.id)} aria-label="Toggle done">
                  {f.done ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={"text-sm " + (f.done ? "line-through text-muted-foreground" : "")}>{f.action} · {format(new Date(f.scheduledAt), "PP p")}</p>
                  {f.notes && <p className="text-[11px] text-muted-foreground">{f.notes}</p>}
                </div>
                <button onClick={() => deleteFollowUp(f.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Editable({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">{label}</p>
      {children}
    </div>
  );
}
