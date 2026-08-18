import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { priceCake } from "../lib/pricing";
import { PRESETS } from "../lib/presets";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/**
 * Designs only.
 *
 * This used to mirror all ten option groups into a CatalogItem table, deriving
 * each price by running the pricing engine so the two could not disagree. They
 * could not disagree because nothing ever read the table: the UI has always
 * rendered lib/catalog.ts and priced from lib/pricing.ts. Keeping a second copy
 * of the catalogue in step by hand bought nothing, so the copy is gone.
 *
 * Presets stay because a Design row is real state — it is what /d/[slug] serves
 * and what an order can be linked to — and totalPaise is cached here so the
 * gallery does not reprice eight cakes on every render.
 */
async function main() {
  for (const p of PRESETS) {
    const totalPaise = priceCake(p.config).total;
    await db.design.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, config: p.config, totalPaise },
      update: { config: p.config, totalPaise },
    });
  }

  console.log(`Seeded ${PRESETS.length} presets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
