import type { CakeConfig } from "./schema";

export type Severity = "block" | "warn";

export interface RuleViolation {
  id: string;
  severity: Severity;
  field: keyof CakeConfig;
  message: string;              // plain language, no jargon
  fix?: { label: string; patch: Partial<CakeConfig> };
}

type Rule = (c: CakeConfig) => RuleViolation | null;

const rules: Rule[] = [
  // --- Structural ---
  (c) => c.frosting === "whipped-cream" && c.tiers > 1 ? {
    id: "whipped-cream-tiers",
    severity: "block",
    field: "frosting",
    message: "Whipped cream can't support a tiered cake — it collapses under the weight.",
    fix: { label: "Use Swiss meringue instead", patch: { frosting: "swiss-meringue" } },
  } : null,

  (c) => c.tiers > 1 && (c.size === "0.5kg" || c.size === "1kg") ? {
    id: "tiers-too-small",
    severity: "block",
    field: "tiers",
    message: "A tiered cake needs at least 1.5kg to look right — the upper tier would be tiny.",
    fix: { label: "Change to 1.5kg", patch: { size: "1.5kg" } },
  } : null,

  (c) => c.tiers === 3 && c.size !== "3kg" && c.size !== "5kg" ? {
    id: "three-tier-size",
    severity: "block",
    field: "tiers",
    message: "Three tiers need 3kg or more.",
    fix: { label: "Change to 3kg", patch: { size: "3kg" } },
  } : null,

  // --- Finish compatibility ---
  (c) => c.coverage === "naked" && c.hasDrip ? {
    id: "naked-drip",
    severity: "block",
    field: "hasDrip",
    message: "A drip needs a frosted surface to run down. Naked cakes have exposed sponge.",
    fix: { label: "Remove the drip", patch: { hasDrip: false } },
  } : null,

  (c) => c.frosting === "fondant" && c.finish !== "smooth" ? {
    id: "fondant-finish",
    severity: "block",
    field: "finish",
    message: "Fondant is rolled flat — it only comes in a smooth finish.",
    fix: { label: "Set finish to smooth", patch: { finish: "smooth" } },
  } : null,

  (c) => c.frosting === "mirror-glaze" && c.finish !== "smooth" ? {
    id: "glaze-finish",
    severity: "block",
    field: "finish",
    message: "Mirror glaze is poured — it self-levels to a smooth surface.",
    fix: { label: "Set finish to smooth", patch: { finish: "smooth" } },
  } : null,

  (c) => c.coverage === "naked" && ["fondant", "mirror-glaze"].includes(c.frosting) ? {
    id: "naked-fondant",
    severity: "block",
    field: "coverage",
    message: "Fondant and mirror glaze fully enclose the cake — they can't be applied naked.",
    fix: { label: "Set coverage to full", patch: { coverage: "full" } },
  } : null,

  // --- Handling / climate ---
  (c) => c.frosting === "whipped-cream" && c.delivery !== "pickup" ? {
    id: "whipped-cream-transit",
    severity: "warn",
    field: "frosting",
    message: "Whipped cream softens in Hyderabad heat. It'll arrive fine in an insulated box, but refrigerate it within 30 minutes.",
  } : null,

  (c) => c.toppings.some(t => t.kind === "edible-flower") && c.delivery === "midnight" ? {
    id: "flowers-midnight",
    severity: "warn",
    field: "toppings",
    message: "Fresh flowers are placed at the last moment. On a midnight slot they'll be a few hours old on arrival.",
  } : null,

  // --- Aesthetic guardrails ---
  (c) => c.toppings.length > 3 ? {
    id: "topping-overload",
    severity: "warn",
    field: "toppings",
    message: "Four different toppings tends to look cluttered. Two or three usually reads better.",
  } : null,

  (c) => !!c.message && c.message.length > 30 && c.size === "0.5kg" ? {
    id: "message-too-long",
    severity: "warn",
    field: "message",
    message: "That message will be hard to read on a 0.5kg cake. Around 20 characters fits comfortably.",
  } : null,

  // --- Dietary ---
  (c) => c.sugarFree && c.frosting === "fondant" ? {
    id: "sugarfree-fondant",
    severity: "block",
    field: "frosting",
    message: "Fondant is essentially sugar — there's no sugar-free version.",
    fix: { label: "Use Swiss meringue instead", patch: { frosting: "swiss-meringue" } },
  } : null,
];

export function validateCake(c: CakeConfig): RuleViolation[] {
  return rules.map(r => r(c)).filter((v): v is RuleViolation => v !== null);
}

export function canSubmit(c: CakeConfig): boolean {
  return !validateCake(c).some(v => v.severity === "block");
}

/**
 * What would this swatch *introduce*? Used to mark an option before the user
 * commits to it, with the reason attached to the option itself.
 *
 * Only new violations count. Once a cake is already blocked, repeating that
 * same message on every option on the page says nothing about any of them — the
 * inline card under the step is what explains the state you are actually in.
 */
export function blockerFor(
  c: CakeConfig,
  patch: Partial<CakeConfig>,
): RuleViolation | null {
  const already = new Set(
    validateCake(c).filter(v => v.severity === "block").map(v => v.id),
  );

  const introduced = validateCake({ ...c, ...patch })
    .filter(v => v.severity === "block" && !already.has(v.id));

  if (introduced.length === 0) return null;

  // Prefer the violation caused by the field being changed — it reads better.
  const changed = Object.keys(patch) as (keyof CakeConfig)[];
  return introduced.find(v => changed.includes(v.field)) ?? introduced[0];
}
