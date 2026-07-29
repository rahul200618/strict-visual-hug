import type { CrmLead, CrmProperty, LeadKind, LeadPriority, LeadSource, LeadStatus } from "./mock/store";
import { createLead } from "./mock/store";

// Helper to escape CSV field values safely
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

// Trigger browser download of CSV string
function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ========================================================
// 1. EXPORT LEADS TO CSV
// ========================================================
export function exportLeadsToCsv(leads: CrmLead[], filename = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`) {
  const headers = [
    "ID",
    "Kind",
    "Name",
    "Phone",
    "Email",
    "Source",
    "Status",
    "Priority",
    "Location",
    "Property Type",
    "Expected Price",
    "Assignee",
    "Message",
    "Created At",
    "Interactions Count",
  ];

  const rows = leads.map((l) => [
    escapeCsvValue(l.id),
    escapeCsvValue(l.kind),
    escapeCsvValue(l.name),
    escapeCsvValue(l.phone),
    escapeCsvValue(l.email || ""),
    escapeCsvValue(l.source),
    escapeCsvValue(l.status),
    escapeCsvValue(l.priority),
    escapeCsvValue(l.location || ""),
    escapeCsvValue(l.propertyType || ""),
    escapeCsvValue(l.expectedPrice || ""),
    escapeCsvValue(l.assignee || ""),
    escapeCsvValue(l.message || ""),
    escapeCsvValue(l.createdAt),
    escapeCsvValue(l.interactions?.length || 0),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csvContent, filename);
}

// ========================================================
// 2. EXPORT PROPERTIES TO CSV
// ========================================================
export function exportPropertiesToCsv(properties: CrmProperty[], filename = `properties_export_${new Date().toISOString().slice(0, 10)}.csv`) {
  const headers = [
    "ID",
    "Title",
    "City",
    "Location",
    "Type",
    "Status",
    "Price",
    "Currency",
    "Bedrooms",
    "Bathrooms",
    "Area SqFt",
    "Parking",
    "Furnished",
    "Facing",
    "Owner Name",
    "Owner Phone",
    "Owner Email",
    "Published",
    "Featured",
    "Created At",
  ];

  const rows = properties.map((p) => [
    escapeCsvValue(p.id),
    escapeCsvValue(p.title),
    escapeCsvValue(p.city),
    escapeCsvValue(p.location),
    escapeCsvValue(p.type),
    escapeCsvValue(p.status),
    escapeCsvValue(p.price),
    escapeCsvValue(p.currency),
    escapeCsvValue(p.bedrooms),
    escapeCsvValue(p.bathrooms),
    escapeCsvValue(p.area),
    escapeCsvValue(p.parking),
    escapeCsvValue(p.furnished),
    escapeCsvValue(p.facing || ""),
    escapeCsvValue(p.ownerName || ""),
    escapeCsvValue(p.ownerPhone || ""),
    escapeCsvValue(p.ownerEmail || ""),
    escapeCsvValue(p.published ? "Yes" : "No"),
    escapeCsvValue(p.featured ? "Yes" : "No"),
    escapeCsvValue(p.createdAt),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csvContent, filename);
}

// ========================================================
// 3. PARSE & BULK IMPORT LEADS FROM CSV
// ========================================================
export function parseAndImportLeadsCsv(csvText: string): { importedCount: number; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return { importedCount: 0, errors: ["CSV file is empty or only contains header."] };
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/^"|"$/g, ""));

  let importedCount = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]).map((v) => v.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
    if (values.length === 0 || values.every((v) => !v)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || "";
    });

    const name = rowObj["name"] || rowObj["full name"] || rowObj["customer"] || "";
    const phone = rowObj["phone"] || rowObj["phone number"] || rowObj["mobile"] || rowObj["contact"] || "";

    if (!name || !phone) {
      errors.push(`Row ${i + 1}: Missing name or phone number.`);
      continue;
    }

    const kind: LeadKind = (rowObj["kind"] || rowObj["type"] || "Buyer").toLowerCase().includes("seller") ? "Seller" : "Buyer";
    const source: LeadSource = (rowObj["source"] as LeadSource) || "Website";
    const status: LeadStatus = (rowObj["status"] as LeadStatus) || "New";
    const priority: LeadPriority = (rowObj["priority"] as LeadPriority) || "Warm";

    createLead({
      name,
      phone,
      email: rowObj["email"] || "",
      kind,
      source: ["Website", "Referral", "Walk-in", "Portal", "Campaign", "Other"].includes(source) ? source : "Website",
      status: ["New", "Contacted", "Qualified", "Site Visit", "Negotiation", "Closed Won", "Closed Lost"].includes(status) ? status : "New",
      priority: ["Hot", "Warm", "Cold"].includes(priority) ? priority : "Warm",
      location: rowObj["location"] || "",
      propertyType: rowObj["property type"] || rowObj["propertytype"] || "",
      expectedPrice: rowObj["expected price"] || rowObj["expectedprice"] || "",
      message: rowObj["message"] || rowObj["notes"] || "",
      assignee: rowObj["assignee"] || "",
    });

    importedCount++;
  }

  return { importedCount, errors };
}

// Simple regex CSV line splitting supporting quoted values
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      cur += char;
    } else if (char === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}
