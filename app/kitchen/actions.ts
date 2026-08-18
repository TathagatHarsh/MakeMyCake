"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { db, hasDatabase } from "@/lib/db";
import { canTransition } from "@/lib/orders";

/**
 * Move one docket along the board.
 *
 * The board only renders buttons for legal transitions, but a form is not the
 * only thing that can post here and a page left open on a counter goes stale,
 * so the current status is read back and the move re-checked before anything
 * is written. An illegal move writes nothing and re-renders, which puts the
 * real state in front of whoever clicked — the board correcting itself is the
 * feedback, rather than a dialog explaining a race they did not know about.
 */
export async function advanceOrder(formData: FormData) {
  if (!hasDatabase()) return;

  const ref = String(formData.get("ref") ?? "");
  const to = String(formData.get("to") ?? "") as OrderStatus;
  if (!ref || !to) return;

  const order = await db.order.findUnique({
    where: { ref },
    select: { id: true, status: true },
  });
  if (!order) return;

  if (!canTransition(order.status, to)) {
    console.warn("rejected_status_transition", { ref, from: order.status, to });
    revalidatePath("/kitchen");
    return;
  }

  await db.order.update({ where: { id: order.id }, data: { status: to } });
  revalidatePath("/kitchen");
}
