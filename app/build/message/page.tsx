"use client";

import { ColorPicker } from "@/components/builder/ColorPicker";
import { StepFooter } from "@/components/builder/StepNav";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { DELIVERY_OPTIONS, FROSTING_PALETTE } from "@/lib/catalog";
import { OptionGrid } from "@/components/builder/OptionGrid";
import { resolveSlot, servicePincode } from "@/lib/delivery";
import { shade } from "@/lib/color";
import { useConfig, useSetConfig } from "@/lib/store";
import { useView } from "@/lib/view";
import { useEffect, useState } from "react";

export default function MessageStep() {
  const config = useConfig();
  const set = useSetConfig();
  const composing = useView(s => s.composingMessage);
  const setComposing = useView(s => s.setComposingMessage);
  // The field holds what is being typed; the config holds only valid pincodes.
  const [typed, setTyped] = useState(config.pincode ?? "");

  const message = config.message ?? "";

  // Leaving the step puts the plaque back on the cake, whatever state the
  // editor was left in.
  useEffect(() => () => setComposing(false), [setComposing]);
  const slot = resolveSlot(config.delivery, config.pincode);
  const pincodeTyped = (config.pincode ?? "").length === 6;
  const unknownPincode = pincodeTyped && !servicePincode(config.pincode);

  return (
    <>
      <StepHeader title="Message" hint="What it says, and when it arrives." />

      <label className="block">
        <span className="mb-1 flex items-baseline justify-between text-meta text-steel">
          <span>Piped message</span>
          <span className="tabular-nums">{message.length}/60</span>
        </span>
        <input
          type="text"
          maxLength={60}
          value={message}
          placeholder="Happy Birthday Amma"
          onFocus={() => setComposing(true)}
          onChange={(e) => { setComposing(true); set({ message: e.target.value }); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setComposing(false); } }}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-body placeholder:text-steel"
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setComposing(!composing)}
          disabled={!message.trim()}
          className={[
            "rounded-sm px-3 py-1.5 text-meta transition-colors",
            composing
              ? "bg-ink text-paper hover:opacity-90"
              : "border border-rule hover:border-ink",
            !message.trim() ? "cursor-not-allowed opacity-45" : "",
          ].join(" ")}
        >
          {composing ? "Done — place it on the cake" : "Lift it off to read"}
        </button>
        <span className="text-meta text-steel">
          {composing
            ? "Held clear of the cake while you type"
            : "Sitting on the cake"}
        </span>
      </div>

      <p className="mt-2 text-meta leading-snug text-steel">
        Piped by hand onto a white-chocolate plaque, and nothing gets scattered
        on top of it. Leave it empty if you would rather have none.
      </p>

      {message.trim() && (
        <div className="mt-4">
          <ColorPicker
            label="Piping colour"
            value={config.messageColor ?? shade(config.frostingColor, -0.4)}
            onChange={(messageColor) => set({ messageColor })}
            palette={FROSTING_PALETTE}
          />
        </div>
      )}

      <fieldset className="mt-8">
        <legend className="mb-2 text-meta text-steel">
          Delivery
        </legend>
        <OptionGrid
          options={DELIVERY_OPTIONS}
          selected={(c) => c.delivery}
          patch={(delivery) => ({ delivery })}
        />

        <label className="mt-3 block">
          <span className="mb-1 block text-meta text-steel">
            Delivery pincode
          </span>
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={typed}
            placeholder="500081"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              // Only a complete pincode reaches the config. A partial one is not
              // a pincode, it is a customer halfway through typing, and writing
              // it into the shared config on every keystroke pushed six invalid
              // states into undo history and six invalid writes into
              // sessionStorage.
              set({ pincode: v.length === 6 ? v : undefined });
              setTyped(v);
            }}
            onBlur={() => setTyped(config.pincode ?? "")}
            className="w-40 rounded-sm border border-rule bg-paper px-3 py-2 font-mono text-body tabular-nums placeholder:text-steel"
          />
        </label>

        <div className="mt-2 space-y-1 font-mono text-micro leading-relaxed text-steel">
          <p>
            {slot.name} · lead time {slot.effectiveLeadHours} hours · {slot.window}
          </p>
          <p>{slot.note}</p>
          {slot.zoneName && <p>Zone: {slot.zoneName}</p>}
          {!slot.available && slot.unavailableReason && (
            <p className="text-seal">{slot.unavailableReason}</p>
          )}
          {unknownPincode && (
            <p className="text-seal">
              We don&rsquo;t deliver to {config.pincode} yet. Store pickup still works.
            </p>
          )}
        </div>
      </fieldset>

      <ViolationCard />
      <StepFooter />
    </>
  );
}
