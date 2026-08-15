"use client";

import { useMemo } from "react";
import type { CakeConfig } from "@/lib/schema";
import { buildDocket } from "@/lib/docket";
import { allergenLine } from "@/lib/allergens";
import { servingsLabel } from "@/lib/servings";
import { deriveHandling } from "@/lib/servings";
import { DocketLine } from "./DocketLine";
import { PriceBreakdown } from "./PriceBreakdown";

interface Props {
  config: CakeConfig;
  /** Set once the order is placed — the ticket gets stamped. */
  stamped?: string | null;
  /** Server-verified reference, when there is one. */
  reference?: string;
  className?: string;
}

/**
 * Real bakeries write orders on carbon-copy dockets: monospace, cramped,
 * abbreviated, stamped when confirmed. That artifact happens to be exactly the
 * trust surface this needs, so it is the interface rather than a summary panel.
 */
export function Docket({ config, stamped, reference, className }: Props) {
  const d = useMemo(() => buildDocket(config, { ref: reference }), [config, reference]);
  const handling = deriveHandling(config);

  return (
    <aside
      className={`relative flex flex-col bg-paper paper-edge ${className ?? ""}`}
      aria-label="Order docket"
    >
      <div className="border-b border-rule px-3 py-2">
        <div className="flex items-baseline justify-between font-mono text-meta font-bold tracking-wider">
          <span>MAKEMYCAKE</span>
          <span className="text-steel">#{d.ref}</span>
        </div>
      </div>

      {/* A scrollable region has to be reachable by keyboard, or the docket is
          unreadable without a mouse. */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2.5"
        tabIndex={0}
        role="region"
        aria-label="Order breakdown"
      >
        {d.rows.map((r) => (
          <DocketLine key={r.key} label={r.label} value={r.value} delta={r.delta} />
        ))}

        <hr className="my-2 border-0 border-t border-dashed border-rule" />

        <PriceBreakdown price={d.price} dense />

        <hr className="my-2 border-0 border-t border-dashed border-rule" />

        {/* These three lines are the safety-critical part of the docket —
            allergens, portions, storage. They were set in 9.5px tracked-out
            uppercase monospace, which is the least legible combination
            available, on the one block of text nobody can afford to misread.
            Monospace stays, because the docket is a ticket. Uppercase does
            not. */}
        <p className="font-mono text-micro leading-[1.7] text-graphite">
          {allergenLine(config)}
        </p>
        {d.diet.caveat && (
          <p className="mt-1 font-mono text-micro leading-[1.6] text-steel">
            {d.diet.caveat}
          </p>
        )}
        <p className="mt-1 font-mono text-micro leading-[1.7] text-graphite">
          {servingsLabel(config)} · {handling.storage}
        </p>
        <p className="mt-1 font-mono text-micro leading-[1.7] text-graphite">
          {d.delivery.slot} · lead {d.delivery.leadTime}
        </p>
        {d.fssai && (
          <p className="mt-2 font-mono text-micro leading-[1.6] text-steel">
            FSSAI Lic. No. {d.fssai}
          </p>
        )}
      </div>

      {stamped && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="stamp px-4 py-2 font-mono text-sm font-bold uppercase">
            {stamped}
          </div>
        </div>
      )}
    </aside>
  );
}

/** Mobile: a persistent total bar that expands into the full ticket. */
export function DocketTotal({
  config,
  onExpand,
  expanded,
}: {
  config: CakeConfig;
  onExpand: () => void;
  expanded: boolean;
}) {
  const d = useMemo(() => buildDocket(config), [config]);

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-expanded={expanded}
      // min-h-12: this is the primary control on a phone, and it previously
      // cleared 44px only by accident of line-height.
      className="flex min-h-12 w-full items-center justify-between border-t border-rule bg-paper px-4 py-2.5 text-left font-mono text-meta tabular-nums"
    >
      <span className="text-steel">
        {expanded ? "Hide breakdown" : "Total · tap for breakdown"}
      </span>
      <span
        key={d.price.total}
        className="text-item font-bold text-ink motion-safe:animate-[price-tick_var(--dur-settle)_var(--ease-out)]"
      >
        ₹{(d.price.total / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </span>
    </button>
  );
}
