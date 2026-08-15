"use client";

import type { CakeConfig } from "@/lib/schema";
import { validateCake } from "@/lib/rules";
import { useConfig, useSetConfig } from "@/lib/store";

/**
 * Blocks get an inline card with the reason and a one-tap fix. Warnings get a
 * quiet note. Neither is ever a modal or a toast — the message belongs attached
 * to the thing it is about, phrased as a fact about cake rather than about
 * software.
 */
export function ViolationCard({ field }: { field?: keyof CakeConfig }) {
  const config = useConfig();
  const set = useSetConfig();

  const violations = validateCake(config).filter(v => !field || v.field === field);
  if (violations.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {violations.map((v) => (
        <div
          key={v.id}
          role={v.severity === "block" ? "alert" : "status"}
          className={[
            "rounded-sm border px-3 py-2.5",
            v.severity === "block"
              ? "border-seal/40 bg-seal/5"
              : "border-rule bg-paper/60",
          ].join(" ")}
        >
          <p className="flex items-start gap-2 text-body leading-snug">
            <span
              aria-hidden
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                v.severity === "block" ? "bg-seal" : "bg-steel"
              }`}
            />
            <span>{v.message}</span>
          </p>

          {v.fix && (
            <button
              type="button"
              onClick={() => set(v.fix!.patch)}
              className="mt-2 ml-3.5 rounded-sm border border-ink px-2.5 py-1 text-meta transition-colors hover:bg-ink hover:text-paper"
            >
              {v.fix.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
