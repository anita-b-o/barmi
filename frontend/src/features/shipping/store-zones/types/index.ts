export interface ShippingZone {
  id?: string;
  type: 'EXACT' | 'RANGE';
  postalCode?: string;
  rangeStart?: number;
  rangeEnd?: number;
  costAmount: number;
  currency: string;
  createdAt?: string;
}

export type CreateZonePayload = 
  | { type: 'EXACT'; postalCode: string; costAmount: number; currency: string; }
  | { type: 'RANGE'; rangeStart: number; rangeEnd: number; costAmount: number; currency: string; };