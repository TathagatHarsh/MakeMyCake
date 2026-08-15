import "dotenv/config";
import { PrismaClient, type ComponentKind } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  COVERAGES, DELIVERY_OPTIONS, FILLINGS, FINISHES, FROSTINGS, PLACEMENTS,
  SHAPES, SIZES, SPONGES, TOPPINGS, type Option,
} from "../lib/catalog";
import { priceCake } from "../lib/pricing";
import { PRESETS } from "../lib/presets";
import { DEFAULT_CAKE } from "../lib/schema";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Catalog deltas mirror lib/pricing.ts. The engine stays the authority on money. */
function deltaFor(kind: ComponentKind, slug: string): number {
  const base = { ...DEFAULT_CAKE };
  const priced = (patch: Partial<typeof DEFAULT_CAKE>) =>
    priceCake({ ...base, ...patch }).subtotal - priceCake(base).subtotal;

  switch (kind) {
    case "SPONGE": return priced({ sponge: slug as typeof base.sponge });
    case "FILLING": return priced({ filling: slug as typeof base.filling });
    case "FROSTING": return priced({ frosting: slug as typeof base.frosting, finish: "smooth" });
    case "FINISH": return priced({ finish: slug as typeof base.finish });
    case "DELIVERY": return priced({ delivery: slug as typeof base.delivery });
    case "TOPPING":
      return priced({ toppings: [{ kind: slug as never, placement: "top-scatter", density: 3 }] });
    case "SIZE":
      return priceCake({ ...base, size: slug as typeof base.size }).subtotal - priceCake(base).subtotal;
    default: return 0;
  }
}

const GROUPS: [ComponentKind, Option<string>[]][] = [
  ["SHAPE", SHAPES],
  ["SIZE", SIZES],
  ["SPONGE", SPONGES],
  ["FILLING", FILLINGS],
  ["FROSTING", FROSTINGS],
  ["COVERAGE", COVERAGES],
  ["FINISH", FINISHES],
  ["TOPPING", TOPPINGS],
  ["PLACEMENT", PLACEMENTS],
  ["DELIVERY", DELIVERY_OPTIONS],
];

async function main() {
  let count = 0;

  for (const [kind, options] of GROUPS) {
    for (const [i, o] of options.entries()) {
      await db.catalogItem.upsert({
        where: { kind_slug: { kind, slug: o.value } },
        create: {
          kind,
          slug: o.value,
          name: o.name,
          blurb: o.blurb,
          swatch: o.swatch ?? null,
          deltaPaise: deltaFor(kind, o.value),
          sortOrder: i,
        },
        update: {
          name: o.name,
          blurb: o.blurb,
          swatch: o.swatch ?? null,
          deltaPaise: deltaFor(kind, o.value),
          sortOrder: i,
          active: true,
        },
      });
      count++;
    }
  }

  for (const p of PRESETS) {
    await db.design.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        config: p.config,
        totalPaise: priceCake(p.config).total,
      },
      update: {
        config: p.config,
        totalPaise: priceCake(p.config).total,
      },
    });
  }

  console.log(`Seeded ${count} catalog items and ${PRESETS.length} presets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
