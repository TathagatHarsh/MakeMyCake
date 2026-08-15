"use client";

import type { Option } from "@/lib/catalog";
import type { CakeConfig } from "@/lib/schema";
import { deltaFor } from "@/lib/pricing";
import { blockerFor } from "@/lib/rules";
import { formatDelta } from "@/lib/format";
import { useConfig, useSetConfig } from "@/lib/store";

interface Props<T extends string> {
  options: Option<T>[];
  /** Reads the current value out of the config. */
  selected: (c: CakeConfig) => T;
  /** Turns a chosen value into a config patch. */
  patch: (value: T) => Partial<CakeConfig>;
  columns?: 2 | 3 | 4;
  /** Names the group for assistive tech: "Shape", "Sponge", and so on. */
  label?: string;
}

/**
 * Every swatch carries its own price delta and, if the combination is
 * impossible, the reason it is.
 *
 * Three things were wrong with how this looked and behaved:
 *
 *  1. Choosing something changed a 1px border from #d5d2cb to #1a1917 and
 *     nothing else. On a screen of eleven near-identical cards that is not a
 *     selection state, it is a rumour. Selected now takes the ink, inverts, and
 *     is the only card on the page that is dark.
 *  2. "included" was printed on every row of a six-row group where everything
 *     was included, so the column carried no information at all while still
 *     costing a column. A free option now says nothing; only a price says
 *     something.
 *  3. The whole group was a pile of independent buttons with aria-pressed. A
 *     single-select group is a radiogroup — that is what tells a screen-reader
 *     user "one of six" instead of eleven separate toggles, and it is what makes
 *     the arrow keys work.
 */
export function OptionGrid<T extends string>({
  options, selected, patch, columns = 2, label,
}: Props<T>) {
  const config = useConfig();
  const set = useSetConfig();
  const current = selected(config);

  // Container queries, not viewport ones: the controls column is narrow on a
  // wide screen, and swatches squeezed into two 160px columns are unreadable.
  const cols = {
    2: "@md:grid-cols-2",
    3: "@md:grid-cols-2 @2xl:grid-cols-3",
    4: "@md:grid-cols-2 @2xl:grid-cols-4",
  }[columns];

  /** Left and right move through the group, the way radios are meant to. */
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 :
      e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    set(patch(next.value));
    const el = e.currentTarget.parentElement?.children[
      (index + step + options.length) % options.length
    ] as HTMLElement | undefined;
    el?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={`grid grid-cols-1 gap-2 ${cols}`}>
      {options.map((o, index) => {
        const p = patch(o.value);
        const blocked = blockerFor(config, p);
        const delta = deltaFor(config, p);
        const active = current === o.value;

        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => set(p)}
            onKeyDown={(e) => onKeyDown(e, index)}
            aria-describedby={blocked ? `why-${o.value}` : undefined}
            className={[
              "group relative flex min-h-[64px] gap-3 rounded-md border px-3.5 py-3 text-left",
              "transition-[background-color,border-color,color,box-shadow]",
              "duration-[--dur-ui] ease-[--ease-out]",
              active
                ? "border-ink bg-ink text-paper shadow-[0_2px_10px_-4px_rgb(23_22_26/0.5)] motion-safe:animate-[chosen_var(--dur-settle)_var(--ease-spring)]"
                : "border-rule bg-paper/70 hover:border-rule-strong hover:bg-paper",
              blocked && !active ? "border-dashed border-seal/45" : "",
            ].join(" ")}
          >
            {o.glyph && (
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className={[
                  "mt-0.5 size-7 shrink-0",
                  active ? "text-paper" : "text-graphite",
                ].join(" ")}
              >
                <path
                  d={o.glyph}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {o.swatch && (
              <span
                aria-hidden
                className={[
                  "mt-0.5 size-7 shrink-0 rounded-full transition-shadow",
                  active ? "ring-2 ring-paper/70" : "ring-1 ring-black/10",
                ].join(" ")}
                style={{ background: o.swatch }}
              />
            )}

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-item leading-tight font-medium">{o.name}</span>
                {/* Free is the default. Saying so on every row of a group where
                    everything is free is noise wearing the costume of detail. */}
                {delta !== 0 && (
                  <span
                    className={[
                      "shrink-0 font-mono text-meta tabular-nums",
                      active ? "text-paper/75" : "text-steel",
                    ].join(" ")}
                  >
                    {formatDelta(delta)}
                  </span>
                )}
              </span>
              <span
                className={[
                  "mt-1 block text-body leading-snug",
                  active ? "text-paper/80" : "text-steel",
                ].join(" ")}
              >
                {o.blurb}
              </span>
              {blocked && (
                <span
                  id={`why-${o.value}`}
                  className={[
                    "mt-1.5 block text-meta leading-snug",
                    active ? "text-paper" : "text-seal",
                  ].join(" ")}
                >
                  {blocked.message}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
