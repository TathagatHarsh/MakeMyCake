"use client";

import { achievable, clampReason, wasClamped } from "@/lib/color";

interface Props {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  palette: { name: string; hex: string }[];
}

/**
 * The UI shows the colour the customer picked; the render shows the one a
 * kitchen can actually mix. Saying so out loud is more honest than quietly
 * desaturating it behind their back.
 */
export function ColorPicker({ label, value, onChange, palette }: Props) {
  const clamped = wasClamped(value);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-meta text-steel">
          {label}
        </span>
        <span className="font-mono text-micro tabular-nums text-steel">
          {value.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {palette.map((p) => (
          <button
            key={p.hex}
            type="button"
            onClick={() => onChange(p.hex)}
            aria-pressed={value.toLowerCase() === p.hex.toLowerCase()}
            title={p.name}
            className={[
              "size-9 rounded-full border-2 transition-transform",
              value.toLowerCase() === p.hex.toLowerCase()
                ? "border-ink scale-110"
                : "border-black/10 hover:scale-105",
            ].join(" ")}
            style={{ background: p.hex }}
          >
            <span className="sr-only">{p.name}</span>
          </button>
        ))}

        <label className="flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-steel/50 hover:border-ink">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="size-0 opacity-0"
            aria-label={`${label} — custom colour`}
          />
          <span aria-hidden className="font-mono text-body leading-none text-steel">+</span>
        </label>
      </div>

      {clamped && (
        <p className="mt-2 flex items-start gap-2 text-meta leading-snug text-steel">
          <span
            aria-hidden
            className="mt-0.5 size-4 shrink-0 rounded-full border border-black/10"
            style={{ background: achievable(value) }}
          />
          <span>{clampReason(value)}</span>
        </p>
      )}
    </div>
  );
}
