import { CakeConfig } from "@/lib/schema";
import { priceCake } from "@/lib/pricing";
import { validateCake } from "@/lib/rules";

/**
 * The authoritative price. The client runs the same function for the live
 * estimate, but this is the number that counts.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const parsed = CakeConfig.safeParse((body as { config?: unknown })?.config);
  if (!parsed.success) {
    return Response.json({ error: "Invalid cake configuration" }, { status: 400 });
  }

  return Response.json({
    price: priceCake(parsed.data),
    violations: validateCake(parsed.data),
  });
}
