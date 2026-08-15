"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildDocket } from "@/lib/docket";
import { formatINR } from "@/lib/format";
import { LazyCakeScene, SceneSkeleton } from "@/components/three/LazyCakeScene";
import { Docket, DocketTotal } from "@/components/docket/Docket";
import { StepNav } from "@/components/builder/StepNav";
import { UndoBar } from "@/components/builder/UndoBar";
import { useConfig, useHydrated } from "@/lib/store";
import { useView } from "@/lib/view";

/**
 * Desktop: canvas left, controls centre, docket pinned right, all three on
 * screen at once and each scrolling on its own. Nobody should have to scroll to
 * see the price, and the canvas must not stretch to whatever height the controls
 * happen to be.
 *
 * Mobile: the canvas is sticky at the top and the controls live below it, so the
 * cake stays visible the whole time you are choosing.
 */
export function BuilderShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const config = useConfig();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sliced = useView(s => s.sliced);
  const toggleSlice = useView(s => s.toggleSlice);

  const onReview = pathname.endsWith("/review");

  /*
   * The controls column is its own scroll container. Going Next replaced its
   * contents but left the scroll position where it was, so on a phone — where
   * every step is taller than the viewport — tapping Next landed you in the
   * middle of the new step with its heading somewhere above you. It also moved
   * no focus and announced nothing, so a screen-reader or keyboard user got no
   * signal that the page had changed at all.
   */
  const controls = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = controls.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    el.focus({ preventScroll: true });
  }, [pathname]);

  /*
   * The price moves on almost every tap and was never spoken. It is the number
   * the customer is tracking through the whole flow, so it gets a polite live
   * region — polite, not assertive, because it should not interrupt the name of
   * the option that was just chosen.
   */
  const total = hydrated ? buildDocket(config).price.total : 0;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      {/* One header at every width. The step nav scrolls horizontally rather
          than wrapping, so it no longer needs a second copy hidden inside the
          controls column below the 3D pane — which is where a phone used to
          find it, three rows deep and after a third of a screen of cake. */}
      <header className="shrink-0 border-b border-rule px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="shrink-0 font-mono text-body font-bold tracking-wider">
            MAKEMYCAKE
          </Link>
          {/* Below xl the nav gets its own row: sharing one with undo/redo left
              it a few pixels wide and it collapsed to nothing. */}
          <div className="hidden min-w-0 flex-1 xl:block">
            <StepNav />
          </div>
          <div className="ml-auto shrink-0 xl:ml-0">
            <UndoBar />
          </div>
        </div>
        <div className="mt-2 xl:hidden">
          <StepNav />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Canvas. 42dvh on a phone was a third of the screen given to a cake
            that has not changed since the last step, pushing the actual choices
            below the fold on every single step. 32dvh still shows the whole
            cake and puts the first two options on screen without a scroll. */}
        <div className="cake-stage relative h-[32dvh] shrink-0 border-b border-rule lg:h-full lg:w-[50%] lg:border-b-0 lg:border-r">
          {/* The 3D pane was an unlabelled, unreachable box: to anyone not
              looking at it, half the product did not exist. It is a figure with
              a caption, and the caption is the cake as currently specified.
              The label sits on the canvas wrapper alone — putting role="img" on
              the pane would swallow the Cut a slice button and make it a
              nested interactive control. */}
          <div
            className="h-full w-full"
            role="img"
            aria-label={
              hydrated
                ? `Preview: ${describeCake(config)}`
                : "Preview of your cake, loading"
            }
          >
            {hydrated ? (
              <LazyCakeScene config={config} autoRotate={onReview} followView />
            ) : (
              <SceneSkeleton />
            )}
          </div>

          {hydrated && (
            <button
              type="button"
              onClick={toggleSlice}
              aria-pressed={sliced}
              className={[
                "absolute bottom-3 left-3 min-h-11 rounded-md border px-3.5 text-meta font-medium",
                "transition-colors duration-[--dur-ui] ease-[--ease-out]",
                sliced
                  ? "border-ink bg-ink text-paper"
                  : "border-rule-strong bg-paper/90 text-ink hover:border-ink",
              ].join(" ")}
            >
              {sliced ? "Whole cake" : "Cut a slice"}
            </button>
          )}
        </div>

        {/* Controls */}
        <main
          ref={controls}
          className="@container min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:h-full lg:w-[29%]"
          tabIndex={-1}
        >
          {hydrated ? children : <ControlSkeleton />}
        </main>

        <p aria-live="polite" className="sr-only">
          {hydrated ? `Total ${formatINR(total)}` : ""}
        </p>

        {/* Docket — desktop */}
        <div className="hidden lg:block lg:h-full lg:w-[21%] lg:shrink-0 lg:border-l lg:border-rule">
          {hydrated && <Docket config={config} className="h-full rounded-none" />}
        </div>
      </div>

      {/* Docket — mobile. Pinned above the fold, never scrolled past. */}
      <div className="shrink-0 lg:hidden">
        {sheetOpen && hydrated && (
          <div className="max-h-[40dvh] overflow-y-auto border-t border-rule">
            <Docket config={config} className="rounded-none border-0" />
          </div>
        )}
        {hydrated && (
          <DocketTotal
            config={config}
            expanded={sheetOpen}
            onExpand={() => setSheetOpen(v => !v)}
          />
        )}
      </div>
    </div>
  );
}

/** One plain sentence naming the cake, for anyone who cannot see the render. */
function describeCake(c: Parameters<typeof buildDocket>[0]): string {
  const t = (s: string) => s.replace(/-/g, " ");
  const bits = [
    `${t(c.size)} ${t(c.shape)} cake`,
    c.tiers > 1 ? `in ${c.tiers} tiers` : null,
    `${t(c.sponge)} sponge`,
    c.filling === "none" ? null : `with ${t(c.filling)}`,
    `covered in ${t(c.frosting)}`,
    `${t(c.finish)} finish`,
    c.hasDrip ? "with a drip" : null,
    c.toppings.length
      ? `topped with ${c.toppings.map(x => t(x.kind)).join(", ")}`
      : null,
    c.message?.trim() ? `and the message “${c.message.trim()}”` : null,
  ].filter(Boolean);
  return bits.join(", ") + ".";
}

function ControlSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-5 w-32 animate-pulse rounded-sm bg-slab-deep" />
      <div className="h-4 w-56 animate-pulse rounded-sm bg-slab-deep" />
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-sm bg-slab-deep" />
        ))}
      </div>
    </div>
  );
}
