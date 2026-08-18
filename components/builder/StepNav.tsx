"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { STEPS } from "@/lib/catalog";
import { validateCake } from "@/lib/rules";
import { useConfig } from "@/lib/store";

/** Which step owns a given config field, so a blocker can be pointed at. */
const FIELD_STEP: Record<string, string> = {
  shape: "shape",
  size: "size", tiers: "size",
  sponge: "sponge", layers: "sponge", eggless: "sponge", sugarFree: "sponge",
  filling: "filling",
  frosting: "frosting", coverage: "frosting",
  finish: "finish", frostingColor: "finish", hasDrip: "finish", dripColor: "finish",
  toppings: "toppings",
  message: "message", messageColor: "message", delivery: "message", pincode: "message",
};

function currentStepIndex(pathname: string): number {
  const slug = pathname.split("/").filter(Boolean).pop();
  const i = STEPS.findIndex(s => s.slug === slug);
  return i === -1 ? 0 : i;
}

/**
 * Every step is a URL, so back, forward and refresh all behave.
 *
 * On a phone this used to be nine tracked-out uppercase links with
 * `flex-wrap`, which laid itself out as three dense rows above the actual
 * content and still told you nothing about how far along you were. It is now
 * one line that scrolls, with the current step scrolled into view, plus a rule
 * that fills as you go — the two things a wizard header owes you: where am I,
 * and how much is left.
 */
export function StepNav() {
  const pathname = usePathname();
  const i = currentStepIndex(pathname);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [i]);

  return (
    <div className="min-w-0">
      <nav
        aria-label="Build steps"
        ref={listRef}
        className="flex min-w-0 gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STEPS.map((s, n) => {
          const state = n === i ? "current" : n < i ? "done" : "todo";
          return (
            <Link
              key={s.slug}
              href={`/build/${s.slug}`}
              aria-current={state === "current" ? "step" : undefined}
              className={[
                "flex shrink-0 items-center gap-1.5 py-1 text-meta whitespace-nowrap",
                "transition-colors duration-[--dur-ui]",
                state === "current" ? "font-semibold text-ink" : "text-steel hover:text-ink",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "grid size-[18px] shrink-0 place-items-center rounded-full text-[10px] tabular-nums",
                  state === "current" ? "bg-ink text-paper" : "",
                  state === "done" ? "bg-rule-strong text-paper" : "",
                  state === "todo" ? "border border-rule text-steel" : "",
                ].join(" ")}
              >
                {state === "done" ? "✓" : n + 1}
              </span>
              {s.title}
            </Link>
          );
        })}
      </nav>

      <div aria-hidden className="mt-1 h-px w-full bg-rule">
        <div
          className="h-px bg-ink transition-[width] duration-[--dur-settle] ease-[--ease-out]"
          style={{ width: `${((i + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Back is always in the same place, and it never loses anything. */
export function StepFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const config = useConfig();
  const i = currentStepIndex(pathname);

  const prev = STEPS[i - 1];
  const next = STEPS[i + 1];

  /*
   * Next used to disable on *any* blocking violation and say "Sort the note
   * above first". But ViolationCard on most steps is filtered to that step's
   * own field, so a frosting blocker disabled Next on the Shape step and
   * pointed at a note that was not on the page and could not be put there. The
   * customer's only way out was to guess which of nine steps to go back to.
   * Now the blocker names itself and links to the step that owns it.
   */
  const blocker = validateCake(config).find(v => v.severity === "block");
  const blockedHere =
    blocker !== undefined &&
    FIELD_STEP[String(blocker.field)] === STEPS[i]?.slug;
  const blocked = blocker !== undefined;
  const blockerStep = blocker ? FIELD_STEP[String(blocker.field)] : undefined;

  // Keyboard: left and right arrows move between steps when nothing has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && el !== document.body && el.tagName !== "MAIN") return;
      if (e.key === "ArrowLeft" && prev) router.push(`/build/${prev.slug}`);
      if (e.key === "ArrowRight" && next && !blocked) router.push(`/build/${next.slug}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, blocked, router]);

  // 44px minimum on all of these: they are the only way through the flow and
  // they were 34px tall.
  const base =
    "inline-flex min-h-11 items-center rounded-md px-4 text-meta font-medium " +
    "transition-colors duration-[--dur-ui] ease-[--ease-out]";

  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-rule pt-4">
      {prev ? (
        <Link href={`/build/${prev.slug}`} className={`${base} border border-rule hover:border-ink`}>
          ← {prev.title}
        </Link>
      ) : (
        <Link href="/" className={`${base} border border-rule hover:border-ink`}>
          ← Start over
        </Link>
      )}

      {next && (
        <div className="flex flex-col items-end gap-1">
          <Link
            href={blocked ? pathname : `/build/${next.slug}`}
            aria-disabled={blocked}
            tabIndex={blocked ? -1 : undefined}
            className={[
              base,
              blocked
                ? "cursor-not-allowed border border-rule text-steel"
                : "bg-ink text-paper hover:bg-graphite",
            ].join(" ")}
          >
            {next.title} →
          </Link>
          {blocked && (
            blockedHere || !blockerStep ? (
              <span className="text-meta text-seal">Sort the note above first</span>
            ) : (
              <Link
                href={`/build/${blockerStep}`}
                className="max-w-[22rem] text-right text-meta text-seal underline underline-offset-2"
              >
                {blocker!.message} Fix it on{" "}
                {STEPS.find(s => s.slug === blockerStep)?.title ?? blockerStep}.
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
