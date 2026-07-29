import { createLead, type CrmLead } from "./store";

export type LeadType = "Buyer" | "Seller";
export type Lead = CrmLead;

export interface SubmitLeadInput {
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  propertyId?: string;
  location?: string;
  propertyType?: string;
  expectedPrice?: string;
  source: string;
}

export function submitLead(input: SubmitLeadInput): Lead {
  return createLead({
    kind: input.type,
    name: input.name,
    phone: input.phone,
    email: input.email,
    message: input.message,
    propertyId: input.propertyId,
    location: input.location,
    propertyType: input.propertyType,
    expectedPrice: input.expectedPrice,
    source: (input.source as CrmLead["source"]) ?? "Website",
  });
}
