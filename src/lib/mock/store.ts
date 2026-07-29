import { useSyncExternalStore } from "react";
import { type Property, type PropertyStatus, type PropertyType } from "./properties";
import { supabase } from "../supabase";
import {
  fetchDbProperties, saveDbProperty, deleteDbProperty,
  fetchDbLeads, saveDbLead, deleteDbLead, saveDbInteraction,
  fetchDbFollowUps, saveDbFollowUp, deleteDbFollowUp,
  fetchDbNotifications, saveDbNotification,
  fetchDbActivity, saveDbActivity,
  fetchDbWebsite, saveDbWebsite,
  mapDbRowToLead, mapDbRowToProperty, mapDbRowToFollowUp, mapDbRowToNotification,
} from "../services/db";

// ---------- Types ----------
export type Role = "admin" | "sales";
export interface AuthUser { id: string; name: string; email: string; role: Role }

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Site Visit" | "Negotiation" | "Closed Won" | "Closed Lost";
export type LeadSource = "Website" | "Referral" | "Walk-in" | "Portal" | "Campaign" | "Other";
export type LeadPriority = "Hot" | "Warm" | "Cold";
export type LeadKind = "Buyer" | "Seller";

export interface Interaction { id: string; at: string; by: string; kind: "Note" | "Call" | "Email" | "Meeting"; text: string }

export interface CrmLead {
  id: string;
  kind: LeadKind;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  propertyId?: string;
  location?: string;
  propertyType?: string;
  expectedPrice?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  assignee?: string;
  createdAt: string;
  interactions: Interaction[];
}

export interface FollowUp {
  id: string;
  leadId: string;
  scheduledAt: string;
  action: "Call" | "Meeting" | "Site Visit" | "Email";
  notes?: string;
  done: boolean;
  createdAt: string;
}

export interface CrmProperty extends Property {
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  published: boolean;
  hideExactLocation: boolean;
  showContact: boolean;
  seoTitle?: string;
  seoDescription?: string;
  internalNotes?: string;
  documents: { id: string; kind: string; name: string }[];
}

export interface Notification {
  id: string;
  at: string;
  kind: "enquiry" | "seller" | "published" | "followup" | "system";
  title: string;
  body?: string;
  read: boolean;
  href?: string;
}

export interface Activity { id: string; at: string; actor: string; text: string }

export interface WebsiteContent {
  heroHeadline: string;
  heroSub: string;
  aboutBody: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  seoTitle: string;
  seoDescription: string;
  testimonials: { id: string; author: string; role: string; quote: string }[];
}

// ---------- Store ----------
interface State {
  user: AuthUser | null;
  leads: CrmLead[];
  followUps: FollowUp[];
  properties: CrmProperty[];
  notifications: Notification[];
  activity: Activity[];
  website: WebsiteContent;
  isHydrated: boolean;
}

const uid = (p = "") => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const defaultWebsite: WebsiteContent = {
  heroHeadline: "Skyward Properties",
  heroSub: "Premium real estate, expertly managed.",
  aboutBody: "Skyward Properties connects buyers, sellers, and investors with the finest properties.",
  contactEmail: "hello@skywardproperties.in",
  contactPhone: "",
  contactAddress: "",
  seoTitle: "Skyward Properties CRM",
  seoDescription: "Premium real estate management platform.",
  testimonials: [],
};

function emptyState(): State {
  return {
    user: null,
    leads: [],
    followUps: [],
    properties: [],
    notifications: [],
    activity: [],
    isHydrated: false,
    website: defaultWebsite,
  };
}

let state: State = emptyState();
const listeners = new Set<() => void>();
let hydrationStarted = false;

function emit() { listeners.forEach((l) => l()); }

function set(mut: (s: State) => void) {
  mut(state);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useCrm<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(state),
    () => sel(emptyState()),
  );
}

// ---------- Realtime subscriptions ----------
function subscribeToRealtime() {
  if (!supabase) return;

  supabase
    .channel("crm-realtime")
    // LEADS
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, ({ new: row }) => {
      const lead = mapDbRowToLead(row as Record<string, unknown>);
      set((s) => { if (!s.leads.find((l) => l.id === lead.id)) s.leads.unshift(lead); });
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, ({ new: row }) => {
      const lead = mapDbRowToLead(row as Record<string, unknown>);
      set((s) => {
        const i = s.leads.findIndex((l) => l.id === lead.id);
        if (i >= 0) s.leads[i] = { ...s.leads[i], ...lead };
      });
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "leads" }, ({ old: row }) => {
      set((s) => { s.leads = s.leads.filter((l) => l.id !== (row as { id: string }).id); });
    })
    // PROPERTIES
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "properties" }, ({ new: row }) => {
      const prop = mapDbRowToProperty(row as Record<string, unknown>);
      set((s) => { if (!s.properties.find((p) => p.id === prop.id)) s.properties.unshift(prop); });
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties" }, ({ new: row }) => {
      const prop = mapDbRowToProperty(row as Record<string, unknown>);
      set((s) => {
        const i = s.properties.findIndex((p) => p.id === prop.id);
        if (i >= 0) s.properties[i] = prop;
      });
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "properties" }, ({ old: row }) => {
      set((s) => { s.properties = s.properties.filter((p) => p.id !== (row as { id: string }).id); });
    })
    // FOLLOW-UPS
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "follow_ups" }, ({ new: row }) => {
      const fu = mapDbRowToFollowUp(row as Record<string, unknown>);
      set((s) => { if (!s.followUps.find((f) => f.id === fu.id)) s.followUps.unshift(fu); });
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "follow_ups" }, ({ new: row }) => {
      const fu = mapDbRowToFollowUp(row as Record<string, unknown>);
      set((s) => {
        const i = s.followUps.findIndex((f) => f.id === fu.id);
        if (i >= 0) s.followUps[i] = fu;
      });
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "follow_ups" }, ({ old: row }) => {
      set((s) => { s.followUps = s.followUps.filter((f) => f.id !== (row as { id: string }).id); });
    })
    // NOTIFICATIONS
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, ({ new: row }) => {
      const n = mapDbRowToNotification(row as Record<string, unknown>);
      set((s) => { if (!s.notifications.find((x) => x.id === n.id)) s.notifications.unshift(n); });
    })
    .subscribe();
}

// ---------- Hydration ----------
async function hydrateFromSupabase() {
  if (hydrationStarted) return;
  hydrationStarted = true;

  try {
    // 1. Restore auth session
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = session.user;
        state.user = {
          id: u.id,
          name: u.user_metadata?.name || u.email?.split("@")[0] || "User",
          email: u.email || "",
          role: (u.user_metadata?.role as Role) || "sales",
        };
      }

      // Listen for future auth changes (sign in / sign out from other tabs)
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const u = session.user;
          set((s) => {
            s.user = {
              id: u.id,
              name: u.user_metadata?.name || u.email?.split("@")[0] || "User",
              email: u.email || "",
              role: (u.user_metadata?.role as Role) || "sales",
            };
          });
        } else if (event === "SIGNED_OUT") {
          set((s) => { s.user = null; });
        }
      });
    }

    // 2. Fetch all data in parallel
    const [p, l, f, n, a, w] = await Promise.all([
      fetchDbProperties(),
      fetchDbLeads(),
      fetchDbFollowUps(),
      fetchDbNotifications(),
      fetchDbActivity(),
      fetchDbWebsite(),
    ]);

    state = {
      ...state,
      properties: p ?? [],
      leads: l ?? [],
      followUps: f ?? [],
      notifications: n ?? [],
      activity: a ?? [],
      website: w ?? state.website,
      isHydrated: true,
    };
    emit();

    // 3. Subscribe to realtime changes
    subscribeToRealtime();
  } catch (e) {
    console.error("Hydration failed:", e);
    state = { ...state, isHydrated: true };
    emit();
  }
}

// Boot on client
if (typeof window !== "undefined") {
  hydrateFromSupabase();
}

// ---------- Auth ----------
/**
 * Sign in with Supabase Auth. Returns an error string on failure, null on success.
 */
export async function login(email: string, password: string, role: Role): Promise<string | null> {
  if (!supabase) return "Database is not configured. Check your .env file.";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return error.message;

  // Persist the selected role in user metadata
  await supabase.auth.updateUser({ data: { role } });

  const user: AuthUser = {
    id: data.user.id,
    name: data.user.user_metadata?.name || email.split("@")[0],
    email,
    role,
  };
  set((s) => { s.user = user; });
  logActivity(user.name, "signed in");
  return null;
}

/** Sign out — clears state immediately, Supabase signOut runs async. */
export function logout() {
  set((s) => { s.user = null; });
  if (supabase) supabase.auth.signOut().catch(console.error);
}

/** Switch role for the current session and persist to Supabase metadata. */
export function switchRole(role: Role) {
  set((s) => { if (s.user) s.user.role = role; });
  if (supabase) supabase.auth.updateUser({ data: { role } }).catch(console.error);
}

// ---------- Leads ----------
export function createLead(input: Partial<CrmLead> & Pick<CrmLead, "name" | "phone" | "kind" | "source">): CrmLead {
  const lead: CrmLead = {
    id: uid("lead_"),
    status: "New",
    priority: "Warm",
    createdAt: new Date().toISOString(),
    interactions: [],
    ...input,
  } as CrmLead;
  set((s) => { s.leads.unshift(lead); });
  saveDbLead(lead);
  notify({
    kind: input.kind === "Seller" ? "seller" : "enquiry",
    title: input.kind === "Seller" ? "New seller enquiry" : "New buyer enquiry",
    body: `${lead.name} — ${lead.location ?? lead.propertyId ?? ""}`,
    href: `/app/leads/${lead.id}`,
  });
  logActivity(state.user?.name ?? "System", `created ${lead.kind.toLowerCase()} lead: ${lead.name}`);
  return lead;
}

export function updateLead(id: string, patch: Partial<CrmLead>) {
  set((s) => {
    const i = s.leads.findIndex((l) => l.id === id);
    if (i >= 0) {
      s.leads[i] = { ...s.leads[i], ...patch };
      saveDbLead(s.leads[i]);
    }
  });
}

export function deleteLead(id: string) {
  set((s) => {
    s.leads = s.leads.filter((l) => l.id !== id);
    s.followUps = s.followUps.filter((f) => f.leadId !== id);
  });
  deleteDbLead(id);
}

export function addInteraction(leadId: string, i: Omit<Interaction, "id" | "at">) {
  const interaction: Interaction = { ...i, id: uid("int_"), at: new Date().toISOString() };
  set((s) => {
    const lead = s.leads.find((l) => l.id === leadId);
    if (lead) lead.interactions.unshift(interaction);
  });
  saveDbInteraction(leadId, interaction);
}

// ---------- Follow-ups ----------
export function createFollowUp(f: Omit<FollowUp, "id" | "createdAt" | "done">) {
  const fu: FollowUp = { ...f, id: uid("fu_"), createdAt: new Date().toISOString(), done: false };
  set((s) => { s.followUps.unshift(fu); });
  saveDbFollowUp(fu);
  return fu;
}

export function toggleFollowUp(id: string) {
  set((s) => {
    const f = s.followUps.find((x) => x.id === id);
    if (f) { f.done = !f.done; saveDbFollowUp(f); }
  });
}

export function deleteFollowUp(id: string) {
  set((s) => { s.followUps = s.followUps.filter((f) => f.id !== id); });
  deleteDbFollowUp(id);
}

// ---------- Properties ----------
export function upsertProperty(p: CrmProperty) {
  set((s) => {
    const i = s.properties.findIndex((x) => x.id === p.id);
    if (i >= 0) s.properties[i] = p; else s.properties.unshift(p);
  });
  saveDbProperty(p);
  logActivity(state.user?.name ?? "System", `saved property "${p.title}"`);
  if (p.published) notify({ kind: "published", title: "Property published", body: p.title });
}

export function deleteProperty(id: string) {
  set((s) => { s.properties = s.properties.filter((p) => p.id !== id); });
  deleteDbProperty(id);
}

export function newPropertyDraft(): CrmProperty {
  return {
    id: uid("prop_"),
    title: "",
    location: "",
    city: "",
    type: "Villa" as PropertyType,
    status: "Available" as PropertyStatus,
    price: 0,
    currency: "₹",
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    parking: 0,
    furnished: "Unfurnished",
    facing: "",
    description: "",
    amenities: [],
    images: [],
    featured: false,
    createdAt: new Date().toISOString(),
    agent: { name: "", title: "", phone: "", email: "", avatar: "" },
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    published: false,
    hideExactLocation: false,
    showContact: true,
    seoTitle: "",
    seoDescription: "",
    internalNotes: "",
    documents: [],
  };
}

// ---------- Notifications ----------
export function notify(n: Omit<Notification, "id" | "at" | "read">) {
  const notif: Notification = { ...n, id: uid("n_"), at: new Date().toISOString(), read: false };
  set((s) => { s.notifications.unshift(notif); });
  saveDbNotification(notif);
}

export function markAllRead() {
  set((s) => { s.notifications.forEach((n) => { n.read = true; saveDbNotification(n); }); });
}

export function markRead(id: string) {
  set((s) => {
    const n = s.notifications.find((n) => n.id === id);
    if (n) { n.read = true; saveDbNotification(n); }
  });
}

// ---------- Website ----------
export function updateWebsite(patch: Partial<WebsiteContent>) {
  set((s) => { s.website = { ...s.website, ...patch }; });
  saveDbWebsite(state.website);
  logActivity(state.user?.name ?? "System", "updated website content");
}

// ---------- Activity ----------
export function logActivity(actor: string, text: string) {
  const item: Activity = { id: uid("a_"), at: new Date().toISOString(), actor, text };
  set((s) => { s.activity.unshift(item); s.activity = s.activity.slice(0, 200); });
  saveDbActivity(item);
}
