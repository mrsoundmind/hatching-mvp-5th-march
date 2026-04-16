# Behaviors - waitlister.framer.media (Final Extraction)

## Interaction model summary
- Overall section is `static + time-driven`.
- No scroll-triggered style morph once in view for footer layers.
- Primary motion is continuous ambient animation (canvas gradient and particle field).
- Entry animations are spring/fade based and run when component appears.

## Animated systems observed in source
1. `Gradient` layer (canvas)
- Rendered in an absolute container covering full section.
- Produces slow blue/purple/teal ambient bloom behind heading.
- Combined with top + side masking gradients so color concentrates near center.

2. `Particles` layer (canvas)
- Separate canvas over top region (`~73%` of section height).
- Tiny stars with twinkle + subtle drift.

3. Horizon glow stack
- Elliptical white gradient arc.
- Dark elliptical dome with inset/highlight shadow.
- Subtle breathing effect in opacity/blur.

4. Entrance behavior (Framer appear config)
- Main badge/content group enters with spring from `y:100`, `scale:0.9`, `opacity:0.001`.
- Form and effect containers fade/appear with staged delay.

## Hover/click behavior
- CTA submit button: hover visual brightening.
- Attribution links: white -> dimmer white on hover, no underline.

## Responsive behavior
- Desktop (`>=1200`): centered single-column hero composition with horizontal attribution row.
- Mobile (`<=809`): tighter width constraints; attribution stacks vertically; heading shrinks to `40/44`.

## Notable non-goals retained
- Framer editor badge (“Made in Framer”) intentionally not cloned into product footer.
