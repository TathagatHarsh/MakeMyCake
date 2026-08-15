"use client";

import { docketAmount } from "@/lib/format";
import type { PriceBreakdown as Breakdown } from "@/lib/pricing";

/**
 * Every line names a real thing. A mystery total is the single clearest tell
 * that a site was thrown together, so this is never collapsed or hidden.
 */
export function PriceBreakdown({
  price,
  dense = false,
}: {
  price: Breakdown;
  dense?: boolean;
}) {
  const row = (label: string, amount: number, strong = false) => (
    <div
      key={label}
      className={`flex items-baseline gap-1 font-mono tabular-nums ${
        dense ? "text-micro leading-[1.9]" : "text-meta leading-[2]"
      } ${strong ? "font-bold" : ""}`}
    >
      <span className="shrink-0">{label}</span>
      <span aria-hidden className="min-w-2 grow docket-leader self-stretch" />
      <span className="shrink-0">{docketAmount(amount)}</span>
    </div>
  );

  return (
    <div>
      {price.lines.map((l, i) => (
        <div
          key={`${l.label}-${i}`}
          className={`flex items-baseline gap-1 font-mono tabular-nums ${
            dense ? "text-micro leading-[1.9]" : "text-meta leading-[2]"
          }`}
        >
          <span className="shrink-0">{l.label}</span>
          <span aria-hidden className="min-w-2 grow docket-leader self-stretch" />
          <span className="shrink-0">{docketAmount(l.amount)}</span>
        </div>
      ))}

      <hr className="my-1.5 border-0 border-t border-dashed border-rule" />
      {row("Subtotal", price.subtotal)}
      {row(`GST @ ${Math.round(price.gstRate * 100)}%`, price.gst)}
      <hr className="my-1.5 border-0 border-t border-dashed border-rule" />

      {/* Ink, not seal. The accent means "something is wrong and you need to
          look at it" — and it cannot also mean "here is your total", because
          then a customer cannot tell a price from a problem. */}
      <div className="flex items-baseline gap-1 font-mono text-body font-bold tabular-nums text-ink">
        <span className="shrink-0">TOTAL</span>
        <span aria-hidden className="min-w-2 grow docket-leader self-stretch" />
        <span
          key={price.total}
          className="shrink-0 motion-safe:animate-[price-tick_var(--dur-settle)_var(--ease-out)]"
        >
          {docketAmount(price.total)}
        </span>
      </div>
    </div>
  );
}
