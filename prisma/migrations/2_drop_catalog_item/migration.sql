-- Drop the catalogue mirror.
--
-- CatalogItem was seeded from lib/catalog.ts with prices derived from
-- lib/pricing.ts, and then read by nothing: the only occurrence of
-- `db.catalogItem` in the entire repository was the seed that wrote it. The UI
-- has always rendered the lib/ constants directly. Two catalogues that can
-- drift, one of them inert, is worse than one.
--
-- OrderItem.catalogItemId was declared to link a docket line back to the
-- catalogue row it came from, and was never populated: all 74 existing rows
-- hold NULL, so the column carries no information to lose.
--
-- Nothing here is authored data. The 77 catalogue rows were derived, and the
-- frozen price lines that actually matter live in OrderItem.label/amountPaise,
-- which are untouched.

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_catalogItemId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "catalogItemId";

-- DropTable
DROP TABLE "CatalogItem";

-- DropEnum
DROP TYPE "ComponentKind";

