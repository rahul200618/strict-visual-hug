import type { CrmLead, CrmProperty } from "./mock/store";

export interface PropertyMatch {
  property: CrmProperty;
  score: number; // 0 to 100
  reasons: string[];
}

export interface LeadMatch {
  lead: CrmLead;
  score: number; // 0 to 100
  reasons: string[];
}

// Parse price string (e.g., "£2.4M", "$1,500,000", "1.8M", "890k") into numeric value
export function parsePriceNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/,/g, "").toLowerCase();
  
  // Matches e.g. "1.8m", "2.4 m"
  const mMatch = cleaned.match(/([\d.]+)\s*m/);
  if (mMatch) return parseFloat(mMatch[1]) * 1_000_000;

  // Matches e.g. "890k", "500 k"
  const kMatch = cleaned.match(/([\d.]+)\s*k/);
  if (kMatch) return parseFloat(kMatch[1]) * 1_000;

  // Raw digits match e.g. "1800000"
  const numMatch = cleaned.match(/[\d.]+/);
  if (numMatch) return parseFloat(numMatch[0]);

  return null;
}

// ========================================================
// 1. MATCH PROPERTIES FOR A SPECIFIC LEAD
// ========================================================
export function matchPropertiesForLead(lead: CrmLead, properties: CrmProperty[]): PropertyMatch[] {
  const availableProps = properties.filter((p) => p.status === "Available" || p.id === lead.propertyId);
  const matches: PropertyMatch[] = [];

  const leadBudget = parsePriceNumber(lead.expectedPrice);
  const leadLocationStr = (lead.location || "").toLowerCase();
  const leadTypeStr = (lead.propertyType || "").toLowerCase();
  const leadMsgStr = (lead.message || "").toLowerCase();

  for (const p of availableProps) {
    let score = 0;
    const reasons: string[] = [];

    // Explicitly linked property
    if (lead.propertyId === p.id) {
      score += 35;
      reasons.push("Explicitly enquired property");
    }

    // Property Type Match
    if (leadTypeStr && p.type.toLowerCase() === leadTypeStr) {
      score += 25;
      reasons.push(`Matches preferred type (${p.type})`);
    } else if (leadMsgStr && leadMsgStr.includes(p.type.toLowerCase())) {
      score += 15;
      reasons.push(`Type mentioned in message (${p.type})`);
    }

    // Location / City Match
    if (leadLocationStr) {
      if (leadLocationStr.includes(p.city.toLowerCase()) || p.city.toLowerCase().includes(leadLocationStr)) {
        score += 25;
        reasons.push(`Matches target city (${p.city})`);
      } else if (leadLocationStr.includes(p.location.toLowerCase()) || p.location.toLowerCase().includes(leadLocationStr)) {
        score += 25;
        reasons.push(`Matches target location (${p.location})`);
      }
    }
    if (leadMsgStr && (leadMsgStr.includes(p.city.toLowerCase()) || leadMsgStr.includes(p.location.toLowerCase()))) {
      if (!reasons.some((r) => r.includes("city") || r.includes("location"))) {
        score += 15;
        reasons.push(`Location mentioned in message (${p.city})`);
      }
    }

    // Budget Compatibility Match
    if (leadBudget && leadBudget > 0) {
      const ratio = p.price / leadBudget;
      if (ratio >= 0.75 && ratio <= 1.25) {
        score += 25;
        reasons.push("Fits target budget window");
      } else if (ratio >= 0.6 && ratio <= 1.4) {
        score += 15;
        reasons.push("Close to target budget window");
      }
    }

    // Featured property boost
    if (p.featured) {
      score += 5;
      reasons.push("Featured showcase portfolio property");
    }

    const finalScore = Math.min(100, Math.max(10, score));
    if (finalScore >= 20 || lead.propertyId === p.id) {
      matches.push({ property: p, score: finalScore, reasons });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

// ========================================================
// 2. MATCH BUYER LEADS FOR A SPECIFIC PROPERTY
// ========================================================
export function matchLeadsForProperty(property: CrmProperty, leads: CrmLead[]): LeadMatch[] {
  const buyerLeads = leads.filter((l) => l.kind === "Buyer" && l.status !== "Closed Lost");
  const matches: LeadMatch[] = [];

  const propPrice = property.price;
  const propCity = property.city.toLowerCase();
  const propLocation = property.location.toLowerCase();
  const propType = property.type.toLowerCase();

  for (const l of buyerLeads) {
    let score = 0;
    const reasons: string[] = [];

    // Directly enquired about this property
    if (l.propertyId === property.id) {
      score += 40;
      reasons.push("Directly enquired about this property");
    }

    // Property Type preference
    if (l.propertyType && l.propertyType.toLowerCase() === propType) {
      score += 25;
      reasons.push(`Looking for ${property.type}`);
    }

    // Location preference
    const loc = (l.location || "").toLowerCase();
    const msg = (l.message || "").toLowerCase();
    if (loc && (loc.includes(propCity) || loc.includes(propLocation))) {
      score += 25;
      reasons.push(`Looking in ${property.city}`);
    } else if (msg && (msg.includes(propCity) || msg.includes(propLocation))) {
      score += 15;
      reasons.push(`Mentioned ${property.city} in enquiry`);
    }

    // Budget match
    const budget = parsePriceNumber(l.expectedPrice);
    if (budget && budget > 0) {
      const ratio = propPrice / budget;
      if (ratio >= 0.75 && ratio <= 1.25) {
        score += 20;
        reasons.push("Property price matches budget");
      }
    }

    const finalScore = Math.min(100, Math.max(10, score));
    if (finalScore >= 30) {
      matches.push({ lead: l, score: finalScore, reasons });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
