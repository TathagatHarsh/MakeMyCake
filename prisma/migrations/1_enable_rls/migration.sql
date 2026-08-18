-- Supabase auto-generates a PostgREST API over the public schema, so without
-- row-level security anyone holding the anon key -- which is publishable, and
-- therefore public -- could read and write every row, including customer names
-- and phone numbers on "Order".
--
-- No policies are added deliberately: with none, the anon and authenticated
-- roles get nothing at all. The application is unaffected because Prisma
-- connects as the table owner, which bypasses RLS unless FORCE is set.
--
-- This lives in the migration history rather than only in Supabase's, so that
-- `prisma migrate reset` reproduces the security posture instead of quietly
-- rebuilding the tables without it.
ALTER TABLE "CatalogItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Design"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem"   ENABLE ROW LEVEL SECURITY;
