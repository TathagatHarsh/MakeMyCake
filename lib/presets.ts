import type { CakeConfig } from "./schema";

export interface Preset {
  slug: string;
  name: string;
  blurb: string;
  config: CakeConfig;
}

export const PRESETS: Preset[] = [
  {
    slug: "classic-truffle",
    name: "Classic Truffle",
    blurb: "The one everybody orders, done properly.",
    config: {
      version: 1,
      shape: "round", size: "1kg", tiers: 1, layers: 3,
      sponge: "belgian-chocolate", filling: "chocolate-mousse",
      frosting: "dark-ganache", coverage: "full", finish: "smooth",
      frostingColor: "#3B2318", hasDrip: true, dripColor: "#3B2318",
      toppings: [{ kind: "chocolate-curl", placement: "top-ring", density: 3 }],
      eggless: true, sugarFree: false, delivery: "standard",
    },
  },
  {
    slug: "strawberry-cream",
    name: "Strawberry & Cream",
    blurb: "Light, seasonal, gone in ten minutes.",
    config: {
      version: 1,
      shape: "round", size: "1kg", tiers: 1, layers: 3,
      sponge: "vanilla", filling: "strawberry-jam",
      frosting: "whipped-cream", coverage: "full", finish: "rustic",
      frostingColor: "#F7F1E6", hasDrip: false,
      toppings: [{ kind: "strawberry", placement: "top-ring", density: 3 }],
      eggless: true, sugarFree: false, delivery: "pickup",
    },
  },
  {
    slug: "red-velvet-classic",
    name: "Red Velvet",
    blurb: "Cream cheese, combed sides, nothing else.",
    config: {
      version: 1,
      shape: "round", size: "1.5kg", tiers: 1, layers: 4,
      sponge: "red-velvet", filling: "none",
      frosting: "cream-cheese", coverage: "full", finish: "combed",
      frostingColor: "#F8F0E2", hasDrip: false,
      toppings: [{ kind: "chocolate-curl", placement: "base-border", density: 2 }],
      eggless: true, sugarFree: false, delivery: "standard",
    },
  },
  {
    slug: "two-tier-celebration",
    name: "Two-Tier Celebration",
    blurb: "For a birthday that matters. Swiss meringue holds it.",
    config: {
      version: 1,
      shape: "round", size: "2kg", tiers: 2, layers: 3,
      sponge: "vanilla", filling: "salted-caramel",
      frosting: "swiss-meringue", coverage: "full", finish: "smooth",
      frostingColor: "#EAC7C0", hasDrip: true, dripColor: "#B07A38",
      toppings: [
        { kind: "macaron", placement: "crown", density: 3 },
        { kind: "gold-leaf", placement: "top-scatter", density: 1 },
      ],
      message: "Happy Birthday",
      eggless: false, sugarFree: false, delivery: "standard",
    },
  },
  {
    slug: "pistachio-rose",
    name: "Pistachio & Rose",
    blurb: "Restrained, adult, faintly floral.",
    config: {
      version: 1,
      shape: "hexagon", size: "1.5kg", tiers: 1, layers: 3,
      sponge: "pistachio", filling: "raspberry-compote",
      frosting: "white-ganache", coverage: "full", finish: "smooth",
      frostingColor: "#A9B99A", hasDrip: false,
      toppings: [
        { kind: "pistachio-crumb", placement: "base-border", density: 3 },
        { kind: "edible-flower", placement: "top-scatter", density: 2 },
      ],
      eggless: true, sugarFree: false, delivery: "standard",
    },
  },
  {
    slug: "naked-carrot",
    name: "Naked Carrot",
    blurb: "Bare sides, visible layers. Looks like it came from a kitchen.",
    config: {
      version: 1,
      shape: "round", size: "1.5kg", tiers: 1, layers: 4,
      sponge: "carrot", filling: "none",
      frosting: "cream-cheese", coverage: "naked", finish: "rustic",
      frostingColor: "#F8F0E2", hasDrip: false,
      toppings: [{ kind: "edible-flower", placement: "top-scatter", density: 2 }],
      eggless: true, sugarFree: false, delivery: "pickup",
    },
  },
  {
    slug: "mirror-glaze-showpiece",
    name: "Mirror Glaze Showpiece",
    blurb: "Poured at 32°C. Photographs better than anything else here.",
    config: {
      version: 1,
      shape: "round", size: "1kg", tiers: 1, layers: 3,
      sponge: "belgian-chocolate", filling: "hazelnut-praline",
      frosting: "mirror-glaze", coverage: "full", finish: "smooth",
      frostingColor: "#C4342A", hasDrip: false,
      toppings: [{ kind: "gold-leaf", placement: "top-scatter", density: 1 }],
      eggless: false, sugarFree: false, delivery: "pickup",
    },
  },
  {
    slug: "kids-funfetti",
    name: "Kids' Funfetti",
    blurb: "Square, loud, and structurally impossible to get wrong.",
    config: {
      version: 1,
      shape: "square", size: "1kg", tiers: 1, layers: 3,
      sponge: "funfetti", filling: "cookie-crumb",
      frosting: "american-buttercream", coverage: "full", finish: "rosette",
      frostingColor: "#A8BDD1", hasDrip: true, dripColor: "#E8D9BE",
      toppings: [
        { kind: "sprinkles", placement: "top-scatter", density: 4 },
        { kind: "oreo", placement: "base-border", density: 3 },
      ],
      message: "Happy Birthday",
      eggless: true, sugarFree: false, delivery: "same-day",
    },
  },
];

export function presetBySlug(slug: string): Preset | undefined {
  return PRESETS.find(p => p.slug === slug);
}
