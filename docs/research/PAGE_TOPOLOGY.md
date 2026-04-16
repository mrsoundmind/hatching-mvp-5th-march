# Page Topology - Waitlister Footer Clone (Landing Integration)

## Placement
- Footer remains the terminal section of `LandingPage.tsx`.
- Existing upper landing sections are preserved.

## Footer composition (top -> bottom)
1. Full-bleed dark section wrapper.
2. Absolute background stack:
- Dynamic gradient canvas.
- Top mask gradient + top fade strip.
- Left/right side masks.
- Particle canvas (upper ~72%).
- Aurora radial blur layer.
- Elliptical white arc layer.
- Elliptical dark horizon dome layer.
3. Main content zone (`h-screen`):
- Pill badge row.
- Heading.
- Supporting text.
- Inline form row.
4. Bottom attribution strip (`~62px`):
- Top border divider.
- Attribution links and separator.

## Dependencies
- `footerVisible` IntersectionObserver triggers staged entry classes.
- Canvas refs (`gradientCanvasRef`, `particlesCanvasRef`) drive ambient time-based animation.

## Interaction model by subpart
- Background: time-driven.
- Foreground text/form: appear-on-view + static after entry.
- Links/buttons: hover/click-driven.
