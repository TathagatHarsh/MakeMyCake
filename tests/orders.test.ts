import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@prisma/client";
import {
  ACTION_LABEL, canTransition, isClosed, NEXT_STATUS, STATUS_LABEL,
} from "@/lib/orders";

const ALL = Object.keys(NEXT_STATUS) as OrderStatus[];

describe("order status machine", () => {
  it("walks a docket from placed to delivered", () => {
    const path: OrderStatus[] = [
      "draft", "confirmed", "in_kitchen", "out_for_delivery", "delivered",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i], path[i + 1]), `${path[i]} -> ${path[i + 1]}`).toBe(true);
    }
  });

  it("never moves a docket backwards", () => {
    // A cake that has left the kitchen cannot be un-baked, and a board people
    // trust is one where a row never quietly regresses.
    const order: OrderStatus[] = [
      "draft", "confirmed", "in_kitchen", "out_for_delivery", "delivered",
    ];
    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j < i; j++) {
        expect(canTransition(order[i], order[j]), `${order[i]} -> ${order[j]}`).toBe(false);
      }
    }
  });

  it("lets anything still open be cancelled, and nothing closed", () => {
    for (const s of ALL) {
      expect(canTransition(s, "cancelled"), s).toBe(!isClosed(s));
    }
  });

  it("treats delivered and cancelled as terminal", () => {
    expect(isClosed("delivered")).toBe(true);
    expect(isClosed("cancelled")).toBe(true);
    expect(NEXT_STATUS.delivered).toEqual([]);
    expect(NEXT_STATUS.cancelled).toEqual([]);
  });

  it("never offers a transition to a status it cannot name", () => {
    // Adding a status to the enum without labelling it would otherwise ship a
    // button with an empty face.
    for (const s of ALL) {
      expect(STATUS_LABEL[s], `STATUS_LABEL.${s}`).toBeTruthy();
      expect(ACTION_LABEL[s], `ACTION_LABEL.${s}`).toBeTruthy();
    }
  });

  it("only ever offers transitions to real statuses", () => {
    for (const s of ALL) {
      for (const next of NEXT_STATUS[s]) {
        expect(ALL, `${s} -> ${next}`).toContain(next);
      }
    }
  });
});
