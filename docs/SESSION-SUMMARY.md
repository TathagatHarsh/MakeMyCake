# Makemycake — build session summary

**Date:** 1–2 August 2026
**Starting point:** `MAKEMYCAKE-PLAN.md`, a six-week implementation plan, and an
empty directory.
**Ending point:** a working product, deployed, with four test suites green.

---

## What was asked, in order

1. Implement the plan as written.
2. Run it locally and show a demo.
3. Name the skills that would have made it better.
4. Install four skill repos, use them, add a cutaway slice and a message plaque
   that lifts while typing, iterate until the product actually feels right.
5. Deploy to Vercel.

---

## What exists now

**Live:** https://makemycake.vercel.app
**Local:** `npm run dev` → http://localhost:3000
**Code:** `Cake Project/makemycake`

A cake configurator: pick shape, size, tiers, sponge, filling, frosting,
coverage, finish, colour, drip, up to four toppings, a piped message and a
delivery slot. The cake renders in 3D as you build. The price is itemised and
recomputed on the server. Impossible combinations are blocked with a plain
explanation and a one-tap fix. The output is an order docket a kitchen could
work from.

### Delivered against the plan

| Section of the plan | State |
|---|---|
| 5 — data model, one JSON config | Done |
| 6 — pricing engine, paise as integers | Done, 14 tests |
| 7 — compatibility rules | Done, 16 tests |
| 8 — the 3D cake, eight realism rules | Done, 12 render passes |
| 9 — builder flow, nine URL steps | Done |
| 10 — trust surface, docket, server verification | Done |
| 11 — file structure | Followed |
| 12 — performance budget | Met and measured |
| 13 — six-week plan | Compressed into one session |
| 15 — definition of done | Met, except the two items below |

### Beyond the plan

- **Cutaway slice** — a wedge comes out so sponge layers and filling are visible.
- **Message plaque** that lifts clear while typing and settles when done, with
  toppings kept off its footprint.
- **Visual regression harness** — pixel baselines for the render.
- **Accessibility suite** — axe-core over every route.

---

## Stack

Node 26 · Next 16.2 (App Router) · React 19.2 · TypeScript strict ·
@react-three/fiber 9.7 + drei 10.7 + three 0.185 · Zustand 5 + zundo 2 ·
Zod 4 · Tailwind 4 · Prisma 7 + PostgreSQL · Vitest 4 · Playwright 1.62

The plan said Next 15 and told me to version-check first. R3F v9 requires
React 19; that constraint held.

---

## Decisions worth remembering

**The cake config is one object.** `lib/schema.ts`. UI edits it, renderer reads
it, server prices it. Never stored twice.

**Money is paise, as integers, everywhere except the render boundary.**

**Pricing is verified on the server** using the *same pure function* the client
runs. The client number is advisory.

**Everything random is seeded from a hash of the config.** Drips, topping
scatter and layer jitter must not reshuffle on a re-render.

**The slice is a view, not a config field.** Putting it in `CakeConfig` would
change the config hash, the docket, the price and every saved design's URL.

**No network at runtime for the 3D.** Normal maps are generated from noise on
the client; the environment map is built from lightformers rather than an HDR
file; the plaque lettering is a canvas texture rather than a downloaded font.

---

## Bugs found, and how

Twelve render passes plus the cutaway work. Full record in
`docs/renders/LOG.md`. The ones that mattered:

1. **`LatheGeometry` spaces V by point index, not arc length.** Every bevelled
   profile gave its long side wall a sliver of the normal map, which showed up
   as vertical hair streaks on every round cake. Single biggest realism win.
2. **Extruded tiers sat 0.96 units above the board** — the extrude runs from
   `-bevelThickness`, and the translate compensated the wrong way.
3. **Extruded tiers had `steps: 1`**, so frosting displacement had no vertices
   to push; square, heart and hexagon came out looking hammered.
4. **`ExtrudeGeometry` cap UVs are world coordinates**, so the message plaque
   sampled one corner of its own texture and the lettering never appeared.
5. **The bundt profile was wound normals-inward** — it rendered inside-out.
6. **Vertex-coloured toppings also got the material colour.** Both multiply, so
   strawberries and oreos came out near-black.
7. **The drip's rim was a circle regardless of shape**, and measured the widest
   point of the whole tier rather than the top band — so it hovered off the side
   of a bundt and clear of the edge it was meant to run off.
8. **Ruffles and rosettes were placed on a ring re-derived from the 2D shape.**
   A bevel offsets an outline along its normal, which is not the same as scaling
   it; on a heart most frills sank inside the cake.
9. **`CakePreview`'s wrapper had no height**, collapsing the canvas on the
   landing and preset pages.
10. **`blockerFor` reported any current violation**, so once a cake was blocked
    every option on the page repeated the same warning.
11. **The frosting shell is a solid**, so its cut face was coplanar with the
    sponge's and won the depth test — the cross-section was a flat slab of
    buttercream with no layers in it. Fixed by leaving the shell uncapped at the
    cut.
12. **The two cut faces face opposite ways**, so one was back-face culled and
    you could see straight through the cake.
13. **The plaque tilted away from the camera**, so the lettering was being read
    off its back — mirrored.

Numbers 1–9 were found by looking at PNGs. That is now automated.

---

## Testing

| Suite | Command | Count |
|---|---|---|
| Unit | `npm test` | 61 |
| End to end | `npm run e2e` | 6 |
| Visual baselines | `npm run visual` | 6 |
| Accessibility | `npm run a11y` | 10 |

Plus `npm run typecheck` and `npm run lint`, both clean.

The visual suite works because the cake is deterministic — same config, same
pixels. Baselines live in `e2e/snapshots/` and are committed.

The axe sweep found two genuine defects: `--steel` was 4.36:1 against the app
background (below the 4.5 threshold), and the docket's scroll region was
unreachable by keyboard. Blocked options used `opacity-55`, which crushed their
text contrast while leaving them clickable.

---

## Measured, not assumed

| Budget | Target | Actual |
|---|---|---|
| 3D bundle | < 400 KB gz | 274 KB gz |
| Time to first cake | < 1.5 s | ~0.7 s |
| WCAG 2.1 AA violations | 0 | 0 across 9 routes |
| Keyboard-only build | works | covered by a test |

---

## Skills

Four repos installed into `~/.claude/skills/`:

- `cloudai-x/threejs-skills` → `threejs-geometry` drove the cutaway
- `maxrihter/claude-skill-visual-regression` → the baseline harness
- `CrazyDubya/claude-skills` → `accessibility-auditor`
- `prisma/skills` → installed, not needed; the v7 work was already done

The honest note: `react-three-fiber` and `threejs-webgl` were **already
available** at the start of the session and were not invoked. Several of the
geometry bugs above are in their remit.

---

## Deliberately unfinished

1. **`lib/photos.ts` is an empty list.** The review page has a "cakes we've
   actually delivered" section that renders only when there is something true to
   put in it. Stock photography under that label would be a lie, and the review
   page only works if it can be trusted.
2. **The FSSAI licence line is hidden.** It was a made-up digit string. That is a
   food-safety registration identifier and publishing an invented one would be a
   lie about a registration that does not exist. Set
   `NEXT_PUBLIC_FSSAI_LICENCE` to the real number and the line appears.
3. **No database is attached to the deployment.** Place order and Save & share
   return an honest 503 rather than a stack trace. Everything else — design,
   price, docket — works. Attach any Postgres, set `DATABASE_URL`, run
   `prisma db push && npm run db:seed`; no code change needed.
4. **The bundt is the weakest render.** It reads as a fluted glazed ring but is
   the least appetising of the twelve. First on the plan's cut list, so it did
   not get another pass.

Not started, by design: payments, authentication, admin dashboard, inventory,
delivery tracking, reviews, notifications. The hooks are in place —
`Order.userId` is nullable, `Order.paymentStatus` defaults to `none`, and the
price breakdown returns `payable` separately from `subtotal`.

---

## One incident

The first Vercel deploy uploaded the local `.env` — the CLI did not honour
`.gitignore` for it — so for a few minutes the live site pointed at
`postgresql://aryurao@localhost:5432/makemycake`. No password in it and it
resolves to nothing from a server, so nothing was exposed. Fixed with an
explicit `.vercelignore` and redeployed.

---

## Open question

A two-tier **heart** stacks a heart on a heart, which reads oddly. Real tiered
hearts are usually a heart over a round. One line in `TIER_RADIUS_RATIO`
handling if that change is wanted.
