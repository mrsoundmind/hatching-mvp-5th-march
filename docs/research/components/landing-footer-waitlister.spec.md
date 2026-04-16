# LandingFooterWaitlister Specification (Final)

## Overview
- Target file: `client/src/pages/LandingPage.tsx`
- Source reference: `https://waitlister.framer.media/?via=hxmzaehsan`
- Source screenshot: `docs/design-references/waitlister.framer.media/source-footer-1280x720-final.png`
- Local QA screenshot: `docs/design-references/local-clone/local-footer-1280x720-final.png`
- Interaction model: `time-driven + appear-on-view + hover/click`

## DOM Structure
- `section` (relative, full-width, dark background)
  - absolute layered background wrapper
    - gradient canvas
    - center-tint blend overlay
    - top/side mask gradients
    - particles canvas
    - aurora radial blur layer
    - white elliptical arc layer
    - dark horizon dome layer
  - foreground content container (`h-screen`)
    - pill badge row
    - heading
    - subcopy
    - email + submit form
  - attribution strip (`border-top`, ~62px)

## Computed Style Targets (source-aligned)

### Section base
- background: `rgb(10,10,10)`
- main content zone height: `100vh`

### Heading
- desktop: `font-size: 60px; line-height: 66px; letter-spacing: -3px; font-weight: 500; width: 520px`
- mobile: `font-size: 40px; line-height: 44px; letter-spacing: -2px; width: 326px`

### Subcopy
- `font-size: 16px; line-height: 24px; letter-spacing: -0.64px; color: rgba(255,255,255,0.56); width: 302px`

### Form row
- desktop width: `395px`, height: `48.7969px`
- mobile width: `304px`, height: `48.7969px`
- input padding: `16px 136px 16px 16px`
- input radius: `8px`
- input bg: `rgba(10,10,10,0.56)`
- submit wrapper: absolute `top/right/bottom: 5px`
- submit width: `120px`, radius: `3px`, bg: `rgb(240,240,240)`

### Horizon layers
- white arc ellipse: approx `2086x955`, bottom `-662px`
- dark dome ellipse: approx `2242x956`, bottom `-668px`
- dark dome shadow: `inset 0 2px 20px #fff, 0 -10px 50px 1px rgba(255,255,255,0.49)`

### Attribution strip
- min-height: ~`62px`
- top border: `rgba(255,255,255,0.08)`
- text: `12px`, `line-height: 14.4px`, `letter-spacing: -0.48px`, base `rgb(153,153,153)`
- links: white default, dimmer on hover

## States & Behaviors

### Enter animation
- Trigger: footer intersects viewport (`IntersectionObserver threshold ~0.28`)
- Initial state: `opacity: 0.001`, `translateY(100px)`, `scale(0.9)`
- Animate: spring-like pop to identity + staged delays

### Ambient animation
- Gradient canvas: multi-blob radial drift (blue/purple/cyan)
- Particle canvas: twinkle + subtle drift of tiny stars
- Horizon dome: breathing opacity/blur cycle

### Hover states
- Submit button brightens on hover.
- Attribution links fade toward `rgba(255,255,255,0.56)`.

## Text Content (local)
- Pill: `Hatchin ✦ Early Access`
- Heading: `Great ideas ship faster with the right team.`
- Subcopy: `Join the waitlist, build momentum, and be first in line when your AI team is ready.`
- Input placeholder: `Your Email Address`
- Submit CTA: `Join Waitlist`
- Attribution: `Proudly Built In Hatchin • Created by the Hatchin team`

## Responsive Behavior
- Desktop: centered single-column, horizontal attribution row.
- Mobile: constrained widths, stacked attribution, preserved horizon effect.
- Breakpoint: ~`809px` behavior switch.
