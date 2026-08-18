import type { DeliverySlot } from "./schema";

/**
 * Named lead times per slot, per pincode. "Fast delivery" means nothing;
 * "arrives within 4 hours of confirmation" is a promise someone can hold us to.
 */
export interface SlotInfo {
  slot: DeliverySlot;
  name: string;
  /** Hours from order confirmation to arrival. */
  leadHours: number;
  window: string;
  note: string;
}

export const SLOTS: Record<DeliverySlot, SlotInfo> = {
  standard: {
    slot: "standard",
    name: "Standard",
    leadHours: 48,
    window: "10:00–20:00, day after tomorrow",
    note: "Baked fresh the morning of delivery.",
  },
  "same-day": {
    slot: "same-day",
    name: "Same day",
    leadHours: 12,
    window: "Order before 11:00, arrives 18:00–21:00",
    note: "Limited to designs we can decorate in a single shift.",
  },
  "express-4hr": {
    slot: "express-4hr",
    name: "Express 4-hour",
    leadHours: 4,
    window: "Within 4 hours of confirmation",
    note: "Dedicated rider. Available 09:00–19:00.",
  },
  midnight: {
    slot: "midnight",
    name: "Midnight",
    leadHours: 24,
    window: "23:30–00:30",
    note: "Rider calls on arrival. Order by 18:00 the previous day.",
  },
  pickup: {
    slot: "pickup",
    name: "Store pickup",
    leadHours: 24,
    window: "Collect 10:00–21:00",
    note: "Jubilee Hills counter. Bring the order reference.",
  },
};

/** Hyderabad service zones. Outer zones add rider time to every slot. */
interface Zone {
  id: "core" | "outer" | "extended";
  name: string;
  extraHours: number;
  /** Express is not offered beyond the core zone. */
  slots: DeliverySlot[];
}

const ZONES: Record<Zone["id"], Zone> = {
  core: {
    id: "core",
    name: "Hyderabad core",
    extraHours: 0,
    slots: ["standard", "same-day", "express-4hr", "midnight", "pickup"],
  },
  outer: {
    id: "outer",
    name: "Hyderabad outer",
    extraHours: 2,
    slots: ["standard", "same-day", "midnight", "pickup"],
  },
  extended: {
    id: "extended",
    name: "Ranga Reddy / Medchal",
    extraHours: 6,
    slots: ["standard", "pickup"],
  },
};

export function zoneForPincode(pincode?: string): Zone | null {
  if (!pincode || !/^\d{6}$/.test(pincode)) return null;
  const n = Number(pincode);
  if (n >= 500001 && n <= 500099) return ZONES.core;
  if (n >= 500100 && n <= 500999) return ZONES.outer;
  if (n >= 501001 && n <= 502999) return ZONES.extended;
  return null;
}

export interface ResolvedSlot extends SlotInfo {
  available: boolean;
  /** Lead time including the zone's rider surcharge. */
  effectiveLeadHours: number;
  zoneName: string | null;
  unavailableReason: string | null;
}

export function resolveSlot(slot: DeliverySlot, pincode?: string): ResolvedSlot {
  const base = SLOTS[slot];
  const zone = zoneForPincode(pincode);

  if (!zone) {
    return {
      ...base,
      available: true,
      effectiveLeadHours: base.leadHours,
      zoneName: null,
      unavailableReason: pincode ? "We don't deliver to that pincode yet." : null,
    };
  }

  const available = zone.slots.includes(slot);
  return {
    ...base,
    available,
    effectiveLeadHours: base.leadHours + (slot === "pickup" ? 0 : zone.extraHours),
    zoneName: zone.name,
    unavailableReason: available
      ? null
      : `${base.name} isn't available in ${zone.name} — the rider can't make the window.`,
  };
}

export function servicePincode(pincode?: string): boolean {
  return zoneForPincode(pincode) !== null;
}
