import type { CakeConfig, Filling, Frosting, Sponge, Topping } from "./schema";

/**
 * Allergens are derived from the config, never typed by hand — a manual field
 * goes stale the moment someone edits a recipe.
 */
export type Allergen =
  | "Milk"
  | "Wheat (gluten)"
  | "Egg"
  | "Soy"
  | "Tree nuts (almond)"
  | "Tree nuts (hazelnut)"
  | "Tree nuts (pistachio)"
  | "Tree nuts (walnut)"
  | "Coconut"
  | "Peanut";

interface Source {
  always: Allergen[];
  /** Present unless the eggless recipe is chosen. */
  eggUnlessEggless?: boolean;
  /** Inherently contains egg — no eggless version of this component exists. */
  eggAlways?: boolean;
}

const SPONGE_ALLERGENS: Record<Sponge, Source> = {
  vanilla: { always: ["Wheat (gluten)", "Milk"], eggUnlessEggless: true },
  "belgian-chocolate": { always: ["Wheat (gluten)", "Milk", "Soy"], eggUnlessEggless: true },
  "red-velvet": { always: ["Wheat (gluten)", "Milk"], eggUnlessEggless: true },
  butterscotch: { always: ["Wheat (gluten)", "Milk"], eggUnlessEggless: true },
  coffee: { always: ["Wheat (gluten)", "Milk"], eggUnlessEggless: true },
  lemon: { always: ["Wheat (gluten)", "Milk"], eggUnlessEggless: true },
  pineapple: { always: ["Wheat (gluten)", "Milk"], eggUnlessEggless: true },
  mango: { always: ["Wheat (gluten)", "Milk"], eggUnlessEggless: true },
  carrot: { always: ["Wheat (gluten)", "Milk", "Tree nuts (walnut)"], eggUnlessEggless: true },
  pistachio: { always: ["Wheat (gluten)", "Milk", "Tree nuts (pistachio)"], eggUnlessEggless: true },
  coconut: { always: ["Wheat (gluten)", "Milk", "Coconut"], eggUnlessEggless: true },
  marble: { always: ["Wheat (gluten)", "Milk", "Soy"], eggUnlessEggless: true },
  funfetti: { always: ["Wheat (gluten)", "Milk", "Soy"], eggUnlessEggless: true },
};

const FILLING_ALLERGENS: Record<Filling, Source> = {
  none: { always: [] },
  "strawberry-jam": { always: [] },
  "raspberry-compote": { always: [] },
  "lemon-curd": { always: ["Milk"], eggUnlessEggless: true },
  "vanilla-custard": { always: ["Milk"], eggUnlessEggless: true },
  "chocolate-mousse": { always: ["Milk", "Soy"] },
  "salted-caramel": { always: ["Milk"] },
  nutella: { always: ["Milk", "Soy", "Tree nuts (hazelnut)"] },
  "hazelnut-praline": { always: ["Milk", "Tree nuts (hazelnut)"] },
  "cookie-crumb": { always: ["Wheat (gluten)", "Soy"] },
  "fresh-fruit": { always: [] },
};

const FROSTING_ALLERGENS: Record<Frosting, Source> = {
  "whipped-cream": { always: ["Milk"] },
  "american-buttercream": { always: ["Milk"] },
  "swiss-meringue": { always: ["Milk"], eggUnlessEggless: true },
  "cream-cheese": { always: ["Milk"] },
  "dark-ganache": { always: ["Milk", "Soy"] },
  "milk-ganache": { always: ["Milk", "Soy"] },
  "white-ganache": { always: ["Milk", "Soy"] },
  fondant: { always: [] },
  "mirror-glaze": { always: ["Milk"] },
};

const TOPPING_ALLERGENS: Record<Topping, Source> = {
  strawberry: { always: [] },
  "mixed-berry": { always: [] },
  "chocolate-shard": { always: ["Milk", "Soy"] },
  "chocolate-curl": { always: ["Milk", "Soy"] },
  macaron: { always: ["Tree nuts (almond)"], eggAlways: true },
  "meringue-kiss": { always: [], eggAlways: true },
  "gold-leaf": { always: [] },
  sprinkles: { always: ["Soy"] },
  "pistachio-crumb": { always: ["Tree nuts (pistachio)"] },
  "edible-flower": { always: [] },
  oreo: { always: ["Wheat (gluten)", "Soy"] },
  ferrero: { always: ["Milk", "Soy", "Wheat (gluten)", "Tree nuts (hazelnut)"] },
};

export interface AllergenReport {
  allergens: Allergen[];
  eggless: boolean;
  /** Set when the customer asked for eggless but a topping inherently has egg. */
  egglessCaveat: string | null;
}

export function deriveAllergens(c: CakeConfig): AllergenReport {
  const set = new Set<Allergen>();
  let inherentEgg = false;
  let recipeEgg = false;

  const sources: Source[] = [
    SPONGE_ALLERGENS[c.sponge],
    FILLING_ALLERGENS[c.filling],
    FROSTING_ALLERGENS[c.frosting],
    ...c.toppings.map(t => TOPPING_ALLERGENS[t.kind]),
  ];

  // The drip is chocolate.
  if (c.hasDrip) { set.add("Milk"); set.add("Soy"); }

  for (const s of sources) {
    for (const a of s.always) set.add(a);
    if (s.eggAlways) inherentEgg = true;
    if (s.eggUnlessEggless && !c.eggless) recipeEgg = true;
  }

  if (inherentEgg || recipeEgg) set.add("Egg");

  const egglessCaveat =
    c.eggless && inherentEgg
      ? "The cake itself is eggless, but the meringue-based toppings you picked contain egg white."
      : null;

  return {
    allergens: [...set].sort(),
    eggless: c.eggless,
    egglessCaveat,
  };
}

export function allergenLine(c: CakeConfig): string {
  const { allergens, eggless } = deriveAllergens(c);
  const diet = eggless ? "EGGLESS" : "CONTAINS EGG";
  if (allergens.length === 0) return diet;
  return `${diet} · CONTAINS: ${allergens.join(", ").toUpperCase()}`;
}
