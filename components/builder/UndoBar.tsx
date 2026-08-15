"use client";

import { useEffect } from "react";
import { useCake, useTemporal } from "@/lib/store";

/**
 * Changing your mind is the normal case, not the exception. ⌘Z / Ctrl+Z works
 * anywhere on the page, and there is a visible control for people who do not
 * know the shortcut.
 */
export function UndoBar() {
  const { canUndo, canRedo, undo, redo } = useTemporal();
  const reset = useCake(s => s.reset);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;

      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Fixed height and no wrapping: these used to break onto two lines inside the
  // header on a phone, which doubled the header and squeezed the step nav out
  // of existence. The arrows carry the meaning at small widths; the words come
  // back at sm and the accessible name is always the full one.
  const btn =
    "inline-flex h-9 items-center justify-center rounded-md border border-rule px-2.5 " +
    "text-meta whitespace-nowrap transition-colors duration-[--dur-ui] " +
    "enabled:hover:border-ink disabled:text-steel/50";

  return (
    <div className="flex items-center gap-1.5">
      {/* Wrapped: undo/redo take a step count, and a click event is not one. */}
      <button
        type="button" onClick={() => undo()} disabled={!canUndo}
        className={btn} aria-label="Undo"
      >
        <span aria-hidden>↩</span>
        <span className="ml-1 hidden sm:inline">Undo</span>
      </button>
      <button
        type="button" onClick={() => redo()} disabled={!canRedo}
        className={btn} aria-label="Redo"
      >
        <span className="mr-1 hidden sm:inline">Redo</span>
        <span aria-hidden>↪</span>
      </button>
      <button
        type="button"
        onClick={() => { reset(); useCake.temporal.getState().clear(); }}
        className={btn}
      >
        Start again
      </button>
    </div>
  );
}
