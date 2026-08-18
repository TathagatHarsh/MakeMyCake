import type { OrderStatus } from "@prisma/client";

/**
 * A docket moves forward, or it is cancelled. Nothing moves backwards: a cake
 * that has left the kitchen cannot be un-baked, and a board people trust is one
 * where a row never quietly regresses.
 *
 * `prisma/schema.prisma` has always described this sequence and nothing ever
 * enforced it, because until now nothing changed a status at all — every order
 * ever placed sat at `draft` forever.
 *
 * The import is type-only, so this file stays runtime-free like the rest of
 * lib/ while the schema remains the single source of truth for the names.
 */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["in_kitchen", "cancelled"],
  in_kitchen: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/**
 * The form is not the only thing that can ask for a transition, so this is
 * checked again on the server before anything is written.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from]?.includes(to) ?? false;
}

/** Terminal states. Useful for splitting a board into work and history. */
export function isClosed(status: OrderStatus): boolean {
  return NEXT_STATUS[status].length === 0;
}

/** What the board calls each state, in the bakery's voice rather than the enum's. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Awaiting our call",
  confirmed: "Confirmed",
  in_kitchen: "In the kitchen",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * The label on the button that moves a docket *to* this state — an instruction
 * to whoever is holding the phone, not a noun.
 */
export const ACTION_LABEL: Record<OrderStatus, string> = {
  draft: "Reopen",
  confirmed: "Confirm",
  in_kitchen: "Start baking",
  out_for_delivery: "Send out",
  delivered: "Mark delivered",
  cancelled: "Cancel",
};
