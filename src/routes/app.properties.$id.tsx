import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { deleteProperty, newPropertyDraft, upsertProperty, useCrm, type CrmProperty } from "@/lib/mock/store";
import { type PropertyStatus, type PropertyType } from "@/lib/mock/properties";
import { ArrowLeft, Trash2, Upload, Star, X, Sparkles, Users } from "lucide-react";
import { matchLeadsForProperty } from "@/lib/matching";


const TYPES: PropertyType[] = ["Villa", "Apartment", "Cabin", "Penthouse", "House"];
const STATUSES: PropertyStatus[] = ["Available", "Reserved", "Sold"];
const FURN = ["Furnished", "Semi-furnished", "Unfurnished"] as const;
const DOC_TYPES = ["Sale Deed", "Khata", "EC", "Tax Receipt", "Layout Plan", "Owner ID"] as const;

export const Route = createFileRoute("/app/properties/$id")({
  head: () => ({ meta: [{ title: "Property — Skyward Properties CRM" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PropertyEditor,
});

function PropertyEditor() {
  const { id } = Route.useParams();
  const existing = useCrm((s) => s.properties.find((p) => p.id === id));
  const allLeads = useCrm((s) => s.leads);
  const navigate = useNavigate();
  const [p, setP] = useState<CrmProperty | null>(null);

  const matchedLeads = useMemo(() => p ? matchLeadsForProperty(p, allLeads) : [], [p, allLeads]);

  useEffect(() => {
    if (id === "new") setP(newPropertyDraft());
    else if (existing) setP(existing);
  }, [id, existing]);

  if (!p) return <div className="p-8">Loading…</div>;

  function up<K extends keyof CrmProperty>(k: K, v: CrmProperty[K]) { setP((prev) => prev ? { ...prev, [k]: v } : prev); }

  function save() {
    if (!p) return;
    if (!p.title || !p.city) { alert("Title and city are required."); return; }
    upsertProperty(p);
    navigate({ to: "/app/properties" });
  }

  async function onFiles(files: FileList | null) {
    if (!files || !p) return;
    const urls = await Promise.all(Array.from(files).map((f) => new Promise<string>((res) => {
      const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f);
    })));
    up("images", [...p.images, ...urls]);
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <Link to="/app/properties" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" /> All properties</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-black tracking-tighter">{id === "new" ? "New property" : p.title || "Untitled property"}</h1>
        <div className="flex items-center gap-2">
          {id !== "new" && (
            <button onClick={() => { if (confirm("Delete this property?")) { deleteProperty(id); navigate({ to: "/app/properties" }); } }}
              className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
          <button onClick={save} className="px-5 py-2 text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground">Save</button>
        </div>
      </header>

      <Section title="Images">
        <label className="border-2 border-dashed border-border p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary">
          <Upload className="h-5 w-5 mb-2 text-muted-foreground" />
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Upload images</span>
          <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {p.images.map((src, i) => (
            <div key={i} className="relative group aspect-[4/3] bg-secondary">
              <img src={src} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute top-1 left-1 text-[10px] font-mono uppercase bg-primary text-primary-foreground px-1.5 py-0.5"><Star className="inline h-3 w-3" /> Cover</span>}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center gap-2 transition-opacity">
                {i !== 0 && <button onClick={() => up("images", [src, ...p.images.filter((_, j) => j !== i)])} className="bg-white/90 text-black px-2 py-1 text-[10px] font-mono uppercase">Cover</button>}
                <button onClick={() => up("images", p.images.filter((_, j) => j !== i))} className="bg-white/90 text-black p-1"><X className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Property">
        <Grid>
          <F label="Title" full><input value={p.title} onChange={(e) => up("title", e.target.value)} className={input} /></F>
          <F label="Type"><select value={p.type} onChange={(e) => up("type", e.target.value as PropertyType)} className={input}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></F>
          <F label="Status"><select value={p.status} onChange={(e) => up("status", e.target.value as PropertyStatus)} className={input}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></F>
          <F label="City"><input value={p.city} onChange={(e) => up("city", e.target.value)} className={input} /></F>
          <F label="Location"><input value={p.location} onChange={(e) => up("location", e.target.value)} className={input} /></F>
          <F label="Price"><input type="number" value={p.price} onChange={(e) => up("price", Number(e.target.value))} className={input} /></F>
          <F label="Currency"><input value={p.currency} onChange={(e) => up("currency", e.target.value)} className={input} /></F>
          <F label="Bedrooms"><input type="number" value={p.bedrooms} onChange={(e) => up("bedrooms", Number(e.target.value))} className={input} /></F>
          <F label="Bathrooms"><input type="number" value={p.bathrooms} onChange={(e) => up("bathrooms", Number(e.target.value))} className={input} /></F>
          <F label="Area (sq ft)"><input type="number" value={p.area} onChange={(e) => up("area", Number(e.target.value))} className={input} /></F>
          <F label="Parking"><input type="number" value={p.parking} onChange={(e) => up("parking", Number(e.target.value))} className={input} /></F>
          <F label="Furnished"><select value={p.furnished} onChange={(e) => up("furnished", e.target.value as CrmProperty["furnished"])} className={input}>{FURN.map((f) => <option key={f}>{f}</option>)}</select></F>
          <F label="Facing"><input value={p.facing} onChange={(e) => up("facing", e.target.value)} className={input} /></F>
          <F label="Amenities (comma-separated)" full><input value={p.amenities.join(", ")} onChange={(e) => up("amenities", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={input} /></F>
          <F label="Description" full><textarea rows={4} value={p.description} onChange={(e) => up("description", e.target.value)} className={input} /></F>
        </Grid>
      </Section>

      <Section title="Owner">
        <Grid>
          <F label="Owner name"><input value={p.ownerName} onChange={(e) => up("ownerName", e.target.value)} className={input} /></F>
          <F label="Owner phone"><input value={p.ownerPhone} onChange={(e) => up("ownerPhone", e.target.value)} className={input} /></F>
          <F label="Owner email"><input value={p.ownerEmail ?? ""} onChange={(e) => up("ownerEmail", e.target.value)} className={input} /></F>
        </Grid>
      </Section>

      <Section title="Publishing">
        <Grid>
          <Toggle label="Published on public site" value={p.published} onChange={(v) => up("published", v)} />
          <Toggle label="Featured on home" value={p.featured} onChange={(v) => up("featured", v)} />
          <Toggle label="Hide exact location" value={p.hideExactLocation} onChange={(v) => up("hideExactLocation", v)} />
          <Toggle label="Show contact on public page" value={p.showContact} onChange={(v) => up("showContact", v)} />
          <F label="SEO title" full><input value={p.seoTitle ?? ""} onChange={(e) => up("seoTitle", e.target.value)} className={input} /></F>
          <F label="SEO description" full><textarea rows={2} value={p.seoDescription ?? ""} onChange={(e) => up("seoDescription", e.target.value)} className={input} /></F>
        </Grid>
      </Section>

      <Section title="Documents (CRM only)">
        <div className="flex flex-wrap gap-2 mb-3">
          {DOC_TYPES.map((k) => (
            <button key={k} onClick={() => up("documents", [...p.documents, { id: Math.random().toString(36).slice(2), kind: k, name: `${k}.pdf` }])}
              className="text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border border-border hover:border-primary">+ {k}</button>
          ))}
        </div>
        <ul className="divide-y divide-border border border-border">
          {p.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-2">{d.kind}</span>{d.name}</span>
              <button onClick={() => up("documents", p.documents.filter((x) => x.id !== d.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
          {p.documents.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">No documents attached.</li>}
        </ul>
      </Section>

      {/* POTENTIAL BUYER LEADS MATCHING */}
      <Section title="Matched Buyer Leads">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Buyer leads in CRM matching this property's specs, location, and price window:</p>
            <span className="font-mono text-[10px] uppercase bg-secondary px-2 py-0.5 rounded">{matchedLeads.length} Matches</span>
          </div>
          {matchedLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No buyer leads currently match this property.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {matchedLeads.slice(0, 4).map(({ lead: l, score, reasons }) => (
                <div key={l.id} className="border border-border p-3 bg-secondary/30 rounded flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link to="/app/leads/$id" params={{ id: l.id }} className="font-semibold text-sm hover:text-primary truncate block">
                      {l.name}
                    </Link>
                    <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                      {score}% Match
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{l.phone} {l.email ? `· ${l.email}` : ""} · Status: <span className="font-mono text-foreground font-medium">{l.status}</span></p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {reasons.map((r, idx) => (
                      <span key={idx} className="text-[9px] font-mono bg-background border border-border text-muted-foreground px-1 py-0.2 rounded">
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section title="Internal notes">
        <textarea rows={3} value={p.internalNotes ?? ""} onChange={(e) => up("internalNotes", e.target.value)} className={input + " w-full"} placeholder="Never shown publicly." />
      </Section>
    </div>
  );
}

const input = "bg-secondary px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-primary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border p-5">
      <h3 className="font-mono text-xs uppercase tracking-[0.25em] mb-4">{title}</h3>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={"block " + (full ? "col-span-2" : "")}><span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">{label}</span>{children}</label>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between border border-border px-3 py-2 cursor-pointer">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="accent-primary h-4 w-4" />
    </label>
  );
}
