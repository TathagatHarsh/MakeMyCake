"use client";

import { create } from "zustand";

/**
 * How the cake is being *looked at*, as opposed to what the cake *is*.
 *
 * None of this belongs in CakeConfig: a slice is not something you order, and
 * putting it there would change the config hash, the docket, the price and
 * every saved design's URL.
 */
interface ViewState {
  /** Cutaway wedge removed so the sponge and filling are visible. */
  sliced: boolean;
  toggleSlice: () => void;

  /**
   * True while the customer is still typing their message. The plaque floats
   * clear of the cake so the lettering is readable against the background
   * rather than against frosting, and settles onto the cake when they're done.
   */
  composingMessage: boolean;
  setComposingMessage: (v: boolean) => void;
}

export const useView = create<ViewState>()((set) => ({
  sliced: false,
  toggleSlice: () => set((s) => ({ sliced: !s.sliced })),

  composingMessage: false,
  setComposingMessage: (composingMessage) => set({ composingMessage }),
}));
