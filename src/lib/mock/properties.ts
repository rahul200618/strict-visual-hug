export type PropertyType = "Villa" | "Apartment" | "Cabin" | "Penthouse" | "House";
export type PropertyStatus = "Available" | "Reserved" | "Sold";

export interface Property {
  id: string;
  title: string;
  location: string;
  city: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area: number; // sq ft
  parking: number;
  furnished: "Furnished" | "Semi-furnished" | "Unfurnished";
  facing: string;
  description: string;
  amenities: string[];
  images: string[]; // cover first
  featured: boolean;
  createdAt: string;
  agent: {
    name: string;
    title: string;
    phone: string;
    email: string;
    avatar: string;
  };
}

export function formatPrice(p: Pick<Property, "price" | "currency">): string {
  if (p.price >= 1_000_000) {
    return `${p.currency}${(p.price / 1_000_000).toFixed(p.price % 1_000_000 === 0 ? 1 : 2)}M`;
  }
  if (p.price >= 1_000) {
    return `${p.currency}${Math.round(p.price / 1_000)}k`;
  }
  return `${p.currency}${p.price}`;
}
