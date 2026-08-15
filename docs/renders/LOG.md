- `2026-08-01-pass1.png` — first light: baseline materials and lighting rig
- `2026-08-01-pass2.png` — fixed extrude Y offset (shapes floated), strawberry tip-up, curl ribbon, bundt single body, rustic amplitude up, glaze roughness 0.06 to 0.11
- `2026-08-01-pass3.png` — outline-based ruffle/rosette placement, bundt glazed as one body, combed ridges from geometry only, noise frequencies up, softer crumb, plumper strawberry
- `2026-08-01-pass4.png` — bundt winding reversed (was inside-out), aspect-corrected normal-map tiling kills the vertical streaking, softer crumb
- `2026-08-01-pass5.png` — arc-length lathe UVs — this was the cause of the vertical streaking on every round cake
- `2026-08-01-solo-heart.png` — heart + plaque close look
- `2026-08-01-pass6.png` — plaque UVs normalised (message now renders), heart mirrored with a rounded point, extrude steps 1 to 14, chunkier rosette, flatter macaron, bigger bundt hole
- `2026-08-01-pass7.png` — vertex-coloured toppings no longer double-multiplied (strawberries and oreos were near-black), taller domed bundt, stronger combed ridges
- `2026-08-01-pass8.png` — drip rim follows the real silhouette (square drips off its corners, bundt keeps its dome), plumper strawberry, bundt height dialled back

## Judgement, after pass 8

Squint test: eleven of twelve read as cake at a glance. The bundt is the weakest
— a fluted glazed ring reads correctly but is the least appetising of the set.
It is first on the cut list in section 14 of the plan, so it stays as-is rather
than absorbing another pass.

Faults found and fixed along the way, in the order they mattered:

1. Extruded shapes sat 0.96 units above the board (extrude runs from
   -bevelThickness, and the translate compensated in the wrong direction).
2. `LatheGeometry` spaces V by point index, not arc length. Every bevelled
   profile gave its long side wall a sliver of the normal map, which showed up
   as vertical brush streaks on every round cake. This was the single biggest
   realism problem.
3. Extruded tiers had `steps: 1`, so the frosting displacement had no vertices
   to push and square/heart/hexagon cakes came out looking hammered.
4. `ExtrudeGeometry` cap UVs are world coordinates, so the message plaque
   sampled one corner of its own texture and the lettering never appeared.
5. The bundt profile was wound so its normals faced into the ring — it rendered
   inside-out.
6. Vertex-coloured toppings were also given the material colour; both multiply,
   so strawberries and oreos came out near-black.
7. The drip's pooled rim was a circle regardless of shape, leaving a hoop
   floating off the side of the bundt.
- `2026-08-01-pass9.png` — aspect-aware camera framing, texture tiles up to 1 world unit and normal strength eased — the felted look at builder zoom is gone

## Passes 9 and after

8. `LatheGeometry` spaces V by point index rather than arc length, so the long
   side wall of every bevelled profile got a sliver of the normal map and it read
   as vertical hair. Remapping V to real arc length was the single biggest gain
   in the whole run.
9. The camera fitted only the vertical field of view, so on the builder's tall
   canvas the cake crowded the frame. Fitting both axes and taking the larger
   distance fixed it.
10. Texture tiles were 0.42 world units — fine in a 285px lab tile, felted at
    builder zoom. Tiles are 1 unit now and the pale frostings' normal strength
    came down with them.
- `2026-08-01-pass10.png` — ruffle and rosette rings measured off the shell silhouette instead of re-derived from the 2D shape — bevel offsetting is not scaling, so on a heart most frills were sinking inside
- `2026-08-01-pass11.png` — drip rim and anchors use the measured shell silhouette too; the ring no longer floats off a heart
- `2026-08-01-pass12.png` — drip rim measured across the top band of the shell only; the widest point of a cake is its side wall, not its bevelled top edge

## Passes 10–12

11. Ruffle and rosette rings were re-derived from the 2D shape. An extrude's
    bevel offsets an outline along its normal, which is not the same as scaling
    it — on a heart the cleft fills in, so most frills sank inside the cake and
    only the few where the two curves crossed were visible. Both now measure the
    finished shell's own silhouette.
12. The drip rim had the same problem, and a second one: it measured the widest
    point of the whole tier. A cake's widest point is its side wall, not its
    bevelled top edge, so the ring hovered clear of the edge it was meant to run
    off. It now measures the top band only.
- `2026-08-01-slice-pass1.png` — first cutaway: sector-clipped lathe with capped cut faces, extruded shapes clipped in 2D
- `2026-08-01-solo-slice.png` — cut face close look
- `2026-08-01-solo-slice.png` — cap winding fixed
- `2026-08-01-solo-slice.png` — depth bias so sponge cross-section draws in front of the frosting cap
- `2026-08-01-solo-slice.png` — frosting open at the cut; sponge and filling capped
- `2026-08-01-solo-slice2.png` — layered cut: belgian chocolate sponge with mousse filling
- `2026-08-01-solo-slice2.png` — layer bands, slab bleed, stack lifted off the shell base
- `2026-08-01-slice-pass2.png` — layer bands between every sponge, slab bleed kills the z-fighting, stack lifted off the shell base


## The cutaway

A wedge comes out of the cake so the sponge and the filling are visible. What
went wrong on the way:

13. The frosting shell is a solid, so its cut face is coplanar with the sponge's
    and won the depth test — the cross-section was a flat slab of buttercream
    with no layers in it at all. A depth bias helped and was still wrong; the
    fix is to leave the shell *uncapped* at the cut, which is also what a thin
    skin of frosting actually looks like.
14. The two cut faces face opposite ways, so one was back-face culled and you
    could see straight through the cake. One cap needs its winding reversed.
15. Stacked slabs share exact planes, and a cut cake puts that z-fighting on
    full display. Every boundary now overlaps by 5 thousandths of a unit.
16. A three-layer cake with no filling cut to a single flat panel of colour.
    Real ones have a scrape of frosting between the layers, and rendering that
    is what makes the cross-section readable.

## The message plaque

17. The plaque tilted *away* from the camera, so the lettering was being read
    off the back of it — mirrored. Positive rotation about X, not negative.
18. The default piping colour was derived from the frosting and came out too
    pale to read against a cream plaque. It is now clamped to a lightness that
    actually contrasts.
