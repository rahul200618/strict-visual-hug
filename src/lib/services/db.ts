import { supabase, isSupabaseConfigured } from "../supabase";
import type { CrmLead, CrmProperty, FollowUp, Interaction, Notification, Activity, WebsiteContent } from "../mock/store";

// ============================================================
// ROW MAPPERS — exported so realtime handlers can reuse them
// ============================================================
export function mapDbRowToProperty(p: Record<string, unknown>): CrmProperty {
  return {
    id: p.id as string,
    title: (p.title as string) || "",
    location: (p.location as string) || "",
    city: (p.city as string) || "",
    type: p.type as CrmProperty["type"],
    status: p.status as CrmProperty["status"],
    price: Number(p.price),
    currency: (p.currency as string) || "₹",
    bedrooms: Number(p.bedrooms) || 0,
    bathrooms: Number(p.bathrooms) || 0,
    area: Number(p.area) || 0,
    parking: Number(p.parking) || 0,
    furnished: p.furnished as CrmProperty["furnished"],
    facing: (p.facing as string) || "",
    description: (p.description as string) || "",
    amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
    images: Array.isArray(p.images) ? (p.images as string[]) : [],
    featured: Boolean(p.featured),
    createdAt: (p.created_at as string) || new Date().toISOString(),
    agent: {
      name: (p.agent_name as string) || "",
      title: (p.agent_title as string) || "",
      phone: (p.agent_phone as string) || "",
      email: (p.agent_email as string) || "",
      avatar: (p.agent_avatar as string) || "",
    },
    ownerName: (p.owner_name as string) || "",
    ownerPhone: (p.owner_phone as string) || "",
    ownerEmail: (p.owner_email as string) || "",
    published: Boolean(p.published),
    hideExactLocation: Boolean(p.hide_exact_location),
    showContact: p.show_contact !== false,
    seoTitle: (p.seo_title as string) || "",
    seoDescription: (p.seo_description as string) || "",
    internalNotes: (p.internal_notes as string) || "",
    documents: Array.isArray(p.documents)
      ? (p.documents as { id: string; kind: string; name: string }[])
      : [],
  };
}

export function mapDbRowToLead(l: Record<string, unknown>): CrmLead {
  return {
    id: l.id as string,
    kind: l.kind as CrmLead["kind"],
    name: (l.name as string) || "",
    phone: (l.phone as string) || "",
    email: (l.email as string) || undefined,
    message: (l.message as string) || undefined,
    propertyId: (l.property_id as string) || undefined,
    location: (l.location as string) || undefined,
    propertyType: (l.property_type as string) || undefined,
    expectedPrice: (l.expected_price as string) || undefined,
    source: l.source as CrmLead["source"],
    status: l.status as CrmLead["status"],
    priority: l.priority as CrmLead["priority"],
    assignee: (l.assignee as string) || undefined,
    createdAt: (l.created_at as string) || new Date().toISOString(),
    interactions: [],
  };
}

export function mapDbRowToFollowUp(f: Record<string, unknown>): FollowUp {
  return {
    id: f.id as string,
    leadId: f.lead_id as string,
    scheduledAt: f.scheduled_at as string,
    action: f.action as FollowUp["action"],
    notes: (f.notes as string) || undefined,
    done: Boolean(f.done),
    createdAt: (f.created_at as string) || new Date().toISOString(),
  };
}

export function mapDbRowToNotification(n: Record<string, unknown>): Notification {
  return {
    id: n.id as string,
    at: n.at as string,
    kind: n.kind as Notification["kind"],
    title: (n.title as string) || "",
    body: (n.body as string) || undefined,
    read: Boolean(n.read),
    href: (n.href as string) || undefined,
  };
}

// ============================================================
// 1. PROPERTIES SERVICE
// ============================================================
export async function fetchDbProperties(): Promise<CrmProperty[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) { console.error("fetchDbProperties:", error); return null; }
    return data.map((p) => mapDbRowToProperty(p as Record<string, unknown>));
  } catch (err) {
    console.error("fetchDbProperties exception:", err);
    return null;
  }
}

export async function saveDbProperty(p: CrmProperty): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("properties").upsert({
      id: p.id,
      title: p.title,
      location: p.location,
      city: p.city,
      type: p.type,
      status: p.status,
      price: p.price,
      currency: p.currency,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      parking: p.parking,
      furnished: p.furnished,
      facing: p.facing,
      description: p.description,
      amenities: p.amenities,
      images: p.images,
      featured: p.featured,
      owner_name: p.ownerName,
      owner_phone: p.ownerPhone,
      owner_email: p.ownerEmail || "",
      published: p.published,
      hide_exact_location: p.hideExactLocation,
      show_contact: p.showContact,
      seo_title: p.seoTitle || "",
      seo_description: p.seoDescription || "",
      internal_notes: p.internalNotes || "",
      documents: p.documents,
      agent_name: p.agent?.name || "",
      agent_title: p.agent?.title || "",
      agent_phone: p.agent?.phone || "",
      agent_email: p.agent?.email || "",
      agent_avatar: p.agent?.avatar || "",
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("saveDbProperty:", error);
    return !error;
  } catch (err) {
    console.error("saveDbProperty exception:", err);
    return false;
  }
}

export async function deleteDbProperty(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    return !error;
  } catch { return false; }
}

// ============================================================
// 2. LEADS & INTERACTIONS SERVICE
// ============================================================
export async function fetchDbLeads(): Promise<CrmLead[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const [leadsRes, intRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("interactions").select("*").order("at", { ascending: false }),
    ]);
    if (leadsRes.error || !leadsRes.data) return null;

    const interactionsMap = new Map<string, Interaction[]>();
    (intRes.data || []).forEach((row) => {
      const list = interactionsMap.get(row.lead_id) || [];
      list.push({ id: row.id, at: row.at, by: row.by, kind: row.kind, text: row.text });
      interactionsMap.set(row.lead_id, list);
    });

    return leadsRes.data.map((l) => ({
      ...mapDbRowToLead(l as Record<string, unknown>),
      interactions: interactionsMap.get(l.id) || [],
    }));
  } catch (err) {
    console.error("fetchDbLeads exception:", err);
    return null;
  }
}

export async function saveDbLead(l: CrmLead): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("leads").upsert({
      id: l.id,
      kind: l.kind,
      name: l.name,
      phone: l.phone,
      email: l.email || "",
      message: l.message || "",
      property_id: l.propertyId || null,
      location: l.location || "",
      property_type: l.propertyType || "",
      expected_price: l.expectedPrice || "",
      source: l.source,
      status: l.status,
      priority: l.priority,
      assignee: l.assignee || "",
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch { return false; }
}

export async function deleteDbLead(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    return !error;
  } catch { return false; }
}

export async function saveDbInteraction(leadId: string, i: Interaction): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("interactions").insert({
      id: i.id, lead_id: leadId, at: i.at, by: i.by, kind: i.kind, text: i.text,
    });
    return !error;
  } catch { return false; }
}

// ============================================================
// 3. FOLLOW-UPS SERVICE
// ============================================================
export async function fetchDbFollowUps(): Promise<FollowUp[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return null;
    return data.map((f) => mapDbRowToFollowUp(f as Record<string, unknown>));
  } catch { return null; }
}

export async function saveDbFollowUp(f: FollowUp): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("follow_ups").upsert({
      id: f.id,
      lead_id: f.leadId,
      scheduled_at: f.scheduledAt,
      action: f.action,
      notes: f.notes || "",
      done: f.done,
    });
    return !error;
  } catch { return false; }
}

export async function deleteDbFollowUp(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("follow_ups").delete().eq("id", id);
    return !error;
  } catch { return false; }
}

// ============================================================
// 4. NOTIFICATIONS & ACTIVITY
// ============================================================
export async function fetchDbNotifications(): Promise<Notification[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("at", { ascending: false });
    if (error || !data) return null;
    return data.map((n) => mapDbRowToNotification(n as Record<string, unknown>));
  } catch { return null; }
}

export async function saveDbNotification(n: Notification): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("notifications").upsert({
      id: n.id, at: n.at, kind: n.kind, title: n.title,
      body: n.body || "", read: n.read, href: n.href || "",
    });
    return !error;
  } catch { return false; }
}

export async function fetchDbActivity(): Promise<Activity[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("activity")
      .select("*")
      .order("at", { ascending: false })
      .limit(200);
    if (error || !data) return null;
    return data.map((a) => ({ id: a.id, at: a.at, actor: a.actor, text: a.text }));
  } catch { return null; }
}

export async function saveDbActivity(a: Activity): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("activity").insert(a);
    return !error;
  } catch { return false; }
}

// ============================================================
// 5. WEBSITE CONTENT
// ============================================================
export async function fetchDbWebsite(): Promise<WebsiteContent | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("website_content")
      .select("*")
      .eq("id", "singleton")
      .single();
    if (error || !data) return null;
    return {
      heroHeadline: data.hero_headline || "",
      heroSub: data.hero_sub || "",
      aboutBody: data.about_body || "",
      contactEmail: data.contact_email || "",
      contactPhone: data.contact_phone || "",
      contactAddress: data.contact_address || "",
      seoTitle: data.seo_title || "",
      seoDescription: data.seo_description || "",
      testimonials: Array.isArray(data.testimonials) ? data.testimonials : [],
    };
  } catch { return null; }
}

export async function saveDbWebsite(w: WebsiteContent): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("website_content").upsert({
      id: "singleton",
      hero_headline: w.heroHeadline,
      hero_sub: w.heroSub,
      about_body: w.aboutBody,
      contact_email: w.contactEmail,
      contact_phone: w.contactPhone,
      contact_address: w.contactAddress,
      seo_title: w.seoTitle,
      seo_description: w.seoDescription,
      testimonials: w.testimonials,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch { return false; }
}
