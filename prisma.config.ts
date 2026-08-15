import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` only needs the schema, but Prisma 7 validates the datasource
 * first. A build with no DATABASE_URL — a preview deployment without a database
 * attached — would otherwise fail before it started. Migrations and seeding
 * still require a real URL and will fail loudly if it is missing.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://unset:unset@localhost:5432/unset",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
