"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { PriceBreakdown } from "@/components/docket/PriceBreakdown";
import { deriveAllergens } from "@/lib/allergens";
import { resolveSlot } from "@/lib/delivery";
import { buildDocket, renderSpecSheet } from "@/lib/docket";
import { formatINR } from "@/lib/format";
import { DELIVERED_PHOTOS } from "@/lib/photos";
import { priceCake } from "@/lib/pricing";
import { canSubmit } from "@/lib/rules";
import { encodeConfig } from "@/lib/share";
import { deriveHandling, deriveServings } from "@/lib/servings";
import { useConfig } from "@/lib/store";

type Stage =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "mismatch"; serverTotal: number }
  | { kind: "placing" }
  | { kind: "placed"; ref: string }
  | { kind: "error"; message: string };

export default function ReviewStep() {
  const config = useConfig();
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const price = priceCake(config);
  const docket = buildDocket(config);
  const allergens = deriveAllergens(config);
  const servings = deriveServings(config);
  const handling = deriveHandling(config);
  const slot = resolveSlot(config.delivery, config.pincode);
  // The server now refuses an order with no name or no reachable number, so the
  // button has to know that too — otherwise the only way to find out is to press
  // the primary action and be told no.
  const contactOk =
    name.trim().length >= 2 &&
    /^(?:\+?91|0)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ""));
  const ready = canSubmit(config) && contactOk;

  // The client number is an estimate until the server agrees with it.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/price", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config }),
    })
      .then(r => r.json())
      .then((data) => {
        if (cancelled) return;
        const serverTotal = data?.price?.total;
        if (typeof serverTotal !== "number") {
          setStage({ kind: "error", message: "We couldn't confirm the price. Try again in a moment." });
          return;
        }
        setStage(serverTotal === price.total
          ? { kind: "idle" }
          : { kind: "mismatch", serverTotal });
      })
      .catch(() => {
        if (!cancelled) {
          setStage({ kind: "error", message: "We couldn't reach the kitchen to confirm the price." });
        }
      });

    return () => { cancelled = true; };
  }, [config, price.total]);

  async function place() {
    setStage({ kind: "placing" });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          config,
          clientTotal: price.total,
          customerName: name,
          customerPhone: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStage({ kind: "error", message: data?.error ?? "The kitchen turned that one down." });
        return;
      }
      setStage({ kind: "placed", ref: data.orderId });
    } catch {
      setStage({ kind: "error", message: "That didn't send. Check your connection and try again." });
    }
  }

  async function save() {
    const res = await fetch("/api/designs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config }),
    });
    const data = await res.json();
    if (res.ok) setShareUrl(`${window.location.origin}${data.url}`);
  }

  function download() {
    const blob = new Blob([renderSpecSheet(config, { ref: stage.kind === "placed" ? stage.ref : undefined })], {
      type: "text/plain;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `makemycake-${docket.ref}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (stage.kind === "placed") {
    return <Placed reference={stage.ref} onDownload={download} slotName={slot.name} leadHours={slot.effectiveLeadHours} />;
  }

  return (
    <>
      <StepHeader title="Review" hint="Check the docket. This is what the kitchen works from." />

      <Section title="Cake">
        <Row k="Shape" v={`${cap(config.shape)}, ${config.tiers} tier${config.tiers > 1 ? "s" : ""}`} />
        <Row k="Weight" v={`${config.size}`} />
        <Row k="Serves" v={`${servings.min}–${servings.max} · ${servings.basis}`} />
        <Row k="Sponge" v={`${cap(config.sponge)}, ${config.layers} layers`} />
        <Row k="Filling" v={cap(config.filling)} />
        <Row k="Frosting" v={`${cap(config.frosting)}, ${cap(config.coverage)}, ${cap(config.finish)}`} />
        {config.hasDrip && <Row k="Drip" v="Yes" />}
        <Row
          k="Toppings"
          v={config.toppings.length
            ? config.toppings.map(t => `${cap(t.kind)} (${cap(t.placement)}, ${t.density}/5)`).join("; ")
            : "None"}
        />
        <Row k="Message" v={config.message?.trim() ? `"${config.message.trim()}"` : "None"} />
      </Section>

      <Section title="Diet">
        <Row k="Eggless" v={config.eggless ? "Yes" : "No"} />
        <Row k="Sugar-free" v={config.sugarFree ? "Yes" : "No"} />
        <Row k="Contains" v={allergens.allergens.length ? allergens.allergens.join(", ") : "No declared allergens"} />
        {allergens.egglessCaveat && <Row k="Note" v={allergens.egglessCaveat} />}
      </Section>

      <Section title="Handling">
        <Row k="Storage" v={handling.storage} />
        <Row k="Serve at" v={handling.serveAt} />
        <Row k="Best before" v={handling.bestBefore} />
      </Section>

      <Section title="Delivery">
        <Row k="Slot" v={slot.name} />
        <Row k="Lead time" v={`${slot.effectiveLeadHours} hours`} />
        <Row k="Window" v={slot.window} />
        <Row k="Pincode" v={config.pincode ?? "Not set"} />
        {!slot.available && slot.unavailableReason && (
          <Row k="Note" v={slot.unavailableReason} />
        )}
      </Section>

      <Section title="Price">
        <PriceBreakdown price={price} />
        <p className="mt-2 text-meta text-steel">
          {stage.kind === "checking"
            ? "Confirming with the kitchen…"
            : stage.kind === "mismatch"
              ? `Kitchen says ${formatINR(stage.serverTotal)} — that is the price that stands.`
              : "Confirmed against the kitchen's own pricing."}
        </p>
      </Section>

      {DELIVERED_PHOTOS.length > 0 && (
        <Section title="Cakes we've actually delivered">
          <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3">
            {DELIVERED_PHOTOS.map(p => (
              <figure key={p.src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt} className="w-full rounded-sm" />
                <figcaption className="mt-1 text-meta leading-snug text-steel">
                  {p.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      <ViolationCard />

      <Section title="Where should it go?">
        <div className="grid gap-3 @md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-meta text-steel">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Who is collecting?"
              className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-body"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-meta text-steel">
              Phone
            </span>
            <input
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10 digits"
              className="w-full rounded-sm border border-rule bg-paper px-3 py-2 font-mono text-body tabular-nums"
            />
          </label>
        </div>
        <p className="mt-2 text-meta leading-snug text-steel">
          No payment now. We call to confirm the design and take payment on
          delivery or at the counter.
        </p>
      </Section>

      {stage.kind === "error" && (
        <p role="alert" className="mt-4 rounded-sm border border-seal/40 bg-seal/5 px-3 py-2.5 text-body">
          {stage.message}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
        <Link
          href="/build/message"
          className="rounded-sm border border-rule px-3 py-2 text-meta hover:border-ink"
        >
          ← Message
        </Link>

        <button
          type="button"
          onClick={place}
          disabled={!ready || stage.kind === "placing" || stage.kind === "checking"}
          /*
           * `disabled:opacity-45` put white text on 45%-opacity seal over paper,
           * which measures about 2.25:1 — and this is the state the button is in
           * the moment you arrive, while the server price check runs. The
           * primary action of the entire product was unreadable on arrival.
           * Disabled now changes the colours rather than the alpha, so the label
           * stays legible and still plainly reads as not-yet-available.
           */
          className={[
            "inline-flex min-h-11 items-center rounded-md px-5 text-meta font-medium",
            "transition-colors duration-[--dur-ui] ease-[--ease-out]",
            "bg-ink text-paper hover:bg-graphite",
            "disabled:cursor-not-allowed disabled:bg-slab-deep disabled:text-steel",
          ].join(" ")}
        >
          {stage.kind === "placing" ? "Sending…" : `Place order · ${formatINR(price.total)}`}
        </button>

        <button
          type="button"
          onClick={save}
          className="rounded-sm border border-rule px-3 py-2 text-meta hover:border-ink"
        >
          Save & share
        </button>

        <button
          type="button"
          onClick={download}
          className="rounded-sm border border-rule px-3 py-2 text-meta hover:border-ink"
        >
          Download docket
        </button>
      </div>

      {shareUrl && (
        <p className="mt-3 break-all font-mono text-meta text-steel">
          Shareable link: <a className="text-ink underline underline-offset-2" href={shareUrl}>{shareUrl}</a>
        </p>
      )}

      <p className="mt-3 font-mono text-micro text-steel">
        Or carry the design in the URL:{" "}
        <Link className="underline underline-offset-2" href={`/d/new?c=${encodeConfig(config)}`}>
          open this cake
        </Link>
      </p>
    </>
  );
}

function Placed({
  reference, onDownload, slotName, leadHours,
}: {
  reference: string; onDownload: () => void; slotName: string; leadHours: number;
}) {
  return (
    <div>
      <h1 className="text-2xl leading-tight">Order {reference}</h1>
      <p className="mt-2 text-body leading-relaxed text-steel">
        The docket is with the kitchen. We&rsquo;ll call to confirm the design and
        the slot — {`${slotName}, ${leadHours} hours`} from confirmation. Keep
        the reference; it&rsquo;s how we find your order.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-sm border border-ink px-3 py-2 text-meta hover:bg-ink hover:text-paper"
        >
          Download docket
        </button>
        <Link
          href="/"
          className="rounded-sm border border-rule px-3 py-2 text-meta hover:border-ink"
        >
          Build another
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2 text-meta text-steel">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 border-b border-rule/60 py-1.5 last:border-0">
      <span className="w-24 shrink-0 text-meta text-steel">
        {k}
      </span>
      <span className="min-w-0 flex-1 text-body leading-snug">{v}</span>
    </div>
  );
}

function cap(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
