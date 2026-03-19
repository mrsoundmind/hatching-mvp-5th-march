# Light & Dark Mode — Full App Theming

**Date**: 2026-03-19
**Status**: Approved
**Scope**: Landing page, login page, main app (all pages and components)

---

## Overview

Add light and dark mode theming across the entire Hatchin app. Uses the existing Tailwind `darkMode: ["class"]` configuration and CSS variable system. OS preference sets the initial default on first visit; after that the user's manual toggle choice persists via localStorage.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default mode | OS preference on first visit, then user choice | Most modern approach, respects user system settings |
| Toggle behavior | Two-state (light/dark) | Simpler than three-way system/light/dark cycling |
| Toggle location | LeftSidebar footer | No top navbar exists; sidebar footer is near user avatar/settings |
| Landing page light mode | Full light redesign | White bg, pastel gradient washes, light glass cards |
| Approach | CSS Variables Only | Minimal code, leverages existing Tailwind + Shadcn infrastructure |

---

## 1. ThemeProvider

**File**: `client/src/components/ThemeProvider.tsx`

React context that manages theme state and applies it to the DOM.

**Behavior**:
- On mount: read `localStorage.getItem("hatchin-theme")`
  - If no stored value: read `window.matchMedia("(prefers-color-scheme: dark)")` to set initial theme
  - If stored value exists: use it directly
- When theme changes: add/remove `.dark` class on `document.documentElement`
- Expose `{ theme, setTheme, toggleTheme }` via `useTheme()` hook

**Types**:
```typescript
type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}
```

**Integration**: Wrap `<Router />` with `<ThemeProvider>` in `App.tsx`:
```tsx
<QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
```

---

## 2. ThemeToggle Component

**File**: `client/src/components/ThemeToggle.tsx`

- Small icon button using Lucide `Sun` and `Moon` icons
- Click calls `toggleTheme()` from `useTheme()`
- Placed in LeftSidebar footer area (near user avatar)

---

## 3. CSS Variable Updates

### `:root` (light mode) — New Hatchin values

Current `:root` has Shadcn light values (correct) but Hatchin dark values (wrong). Update Hatchin custom vars to light:

```css
:root {
  /* Shadcn vars — keep as-is (already light) */

  /* Hatchin Custom Colors — NEW LIGHT VALUES */
  --hatchin-dark: hsl(220, 14%, 96%);        /* soft gray background */
  --hatchin-panel: hsl(0, 0%, 100%);          /* white panels */
  --hatchin-card: hsl(220, 13%, 95%);         /* light gray cards */
  --hatchin-border: hsl(220, 13%, 87%);       /* soft border */
  --hatchin-text: hsl(220, 15%, 15%);         /* near-black text */
  --hatchin-text-muted: hsl(220, 8%, 46%);    /* medium gray muted text */

  /* Accents — same in both modes */
  --hatchin-blue: #6C82FF;
  --hatchin-green: hsl(158, 66%, 57%);
  --hatchin-orange: hsl(25, 100%, 64%);
}
```

### `.dark` — Add Hatchin overrides

Move the current (dark) Hatchin values into `.dark`:

```css
.dark {
  /* Shadcn vars — keep as-is (already dark) */

  /* Hatchin Custom Colors — CURRENT DARK VALUES */
  --hatchin-dark: hsl(210, 5%, 22%);
  --hatchin-panel: hsl(216, 10%, 14%);
  --hatchin-card: hsl(216, 8%, 22%);
  --hatchin-border: hsl(216, 8%, 27%);
  --hatchin-text: hsl(210, 9%, 95%);
  --hatchin-text-muted: hsl(216, 6%, 67%);
}
```

**Result**: Body already uses `var(--hatchin-dark)` and `var(--hatchin-text)` — it auto-switches. All `.hatchin-bg-*` utility classes auto-switch. All Shadcn components auto-switch.

---

## 4. Hardcoded Color Replacements

| File | Line(s) | Current | Replacement |
|------|---------|---------|-------------|
| `App.tsx` | 28, 65 | `bg-[#0A0A0A]` | `bg-background` |
| `App.tsx` | 43, 79 | `text-white` (loading) | `text-foreground` |
| `login.tsx` | multiple | `bg-[#030303]` | `bg-background` |
| `login.tsx` | multiple | `text-white` | `text-foreground` |
| `login.tsx` | multiple | `text-slate-400` | `text-muted-foreground` |
| `LandingPage.tsx` | multiple | `bg-[#030303]` | `bg-background` |
| `LandingPage.tsx` | multiple | `text-white` | `text-foreground` |
| `LandingPage.tsx` | multiple | `text-gray-400` | `text-muted-foreground` |
| `index.css` | 116 | `hsl(216, 8%, 18%)` in `.bg-hatchin-colleague` | `var(--hatchin-card)` |
| `index.css` | 137 | `hsl(216, 8%, 18%)` in `.chat-bubble-user` | `var(--hatchin-card)` |
| `index.css` | 245 | `#A6A7AB` in `.system-notice` | `var(--hatchin-text-muted)` |
| `index.css` | 334 | `#1A1D23`, `#111318` in `.premium-column-bg` | CSS vars (see section 5) |

---

## 5. Premium Utility Classes — Light Variants

### `.premium-column-bg`

Current (dark): gradient from `#1A1D23` to `#111318` with blue glow pseudo-elements.

Add CSS variables and light/dark values:

```css
:root {
  --premium-bg-start: hsl(220, 14%, 97%);
  --premium-bg-end: hsl(220, 14%, 94%);
  --premium-glow-opacity: 0.03;
  --premium-line-opacity: 0.15;
}

.dark {
  --premium-bg-start: #1A1D23;
  --premium-bg-end: #111318;
  --premium-glow-opacity: 0.05;
  --premium-line-opacity: 0.4;
}

.premium-column-bg {
  background: linear-gradient(180deg, var(--premium-bg-start) 0%, var(--premium-bg-end) 100%);
}
```

### `.glass-card-premium`

```css
:root {
  --glass-bg: rgba(0, 0, 0, 0.02);
  --glass-border: rgba(0, 0, 0, 0.06);
  --glass-shadow: rgba(0, 0, 0, 0.06);
  --glass-hover-bg: rgba(0, 0, 0, 0.04);
  --glass-hover-border: rgba(0, 0, 0, 0.1);
}

.dark {
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-shadow: rgba(0, 0, 0, 0.2);
  --glass-hover-bg: rgba(255, 255, 255, 0.05);
  --glass-hover-border: rgba(255, 255, 255, 0.12);
}
```

### `.hatchin-glass`

Same pattern — light uses dark-tinted glass, dark uses white-tinted glass.

---

## 6. Landing Page Light Mode

**Background**: `bg-background` — white in light, near-black in dark.

**Gradient orbs**: Softer in light mode:
- Dark: `from-fuchsia-400/20` on black
- Light: `from-fuchsia-200/30` on white (pastel watercolor washes)

Use `dark:from-fuchsia-400/20 from-fuchsia-200/30` pattern on gradient elements.

**Text**: Replace `text-white` with `text-foreground`, `text-gray-400` with `text-muted-foreground`.

**Glass cards** (feature cards, agent persona cards): Use `.glass-card-premium` vars from section 5.

**CTA buttons**: Keep `hatchin-blue` as primary — works on both backgrounds.

**Agent persona gradient pills**: Keep the same gradient colors (fuchsia, emerald, indigo) — they pop on both white and dark.

---

## 7. Login Page Light Mode

Same treatment as landing page:
- `bg-[#030303]` → `bg-background`
- `text-white` → `text-foreground`
- Animated background orbs: softer opacity in light via `dark:` prefix
- Floating agent cards: keep their gradients (they work on both)

---

## 8. Agent Role Text Colors

Agent roles in `shared/roleRegistry.ts` define Tailwind classes like `text-blue-300` — these are optimized for dark backgrounds.

**Solution**: Add a `textLight` field to each role definition:

```typescript
// In ROLE_DEFINITIONS
{
  role: "product_manager",
  text: "text-blue-300",       // dark mode
  textLight: "text-blue-600",  // light mode
  // ... rest of role fields
}
```

**In components**: Use `dark:text-blue-300 text-blue-600` or conditionally apply based on `useTheme()`.

**Agent bubble backgrounds**: Already use `hsla()` at 12% opacity — these work on both light and dark backgrounds without changes.

---

## 9. Code Syntax Highlighting

Current: imports `highlight.js/styles/github-dark.css` globally.

**Solution**: Import both themes and scope them:

```css
/* In index.css — load light theme by default */
@import 'highlight.js/styles/github.css';

/* Override with dark theme when .dark is on html */
.dark {
  /* dark highlight.js overrides via scoped import or CSS variable approach */
}
```

Alternatively, dynamically swap the stylesheet link in `ThemeProvider` when theme changes.

Simpler approach: use two `<link>` tags with media queries or use a highlight.js theme that supports CSS variables.

---

## 10. Scrollbar Theming

Current scrollbar thumb uses `rgba(108, 130, 255, 0.2)` — this works on dark but is invisible on light.

Update to use CSS variable:

```css
:root {
  --scrollbar-thumb: rgba(108, 130, 255, 0.3);
  --scrollbar-thumb-hover: rgba(108, 130, 255, 0.5);
}

.dark {
  --scrollbar-thumb: rgba(108, 130, 255, 0.2);
  --scrollbar-thumb-hover: rgba(108, 130, 255, 0.4);
}
```

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `client/src/components/ThemeProvider.tsx` | **NEW** — theme context + hook |
| `client/src/components/ThemeToggle.tsx` | **NEW** — sun/moon toggle button |
| `client/src/App.tsx` | Wrap with ThemeProvider, replace hardcoded colors |
| `client/src/index.css` | Update CSS variables, premium utilities, scrollbar |
| `client/src/pages/LandingPage.tsx` | Replace hardcoded dark colors with semantic classes |
| `client/src/pages/login.tsx` | Replace hardcoded dark colors with semantic classes |
| `client/src/components/LeftSidebar.tsx` | Add ThemeToggle to footer |
| `client/src/components/MessageBubble.tsx` | Theme-aware user bubble color |
| `shared/roleRegistry.ts` | Add `textLight` field to role definitions |
| `client/src/lib/agentColors.ts` | Expose `textLight` in AgentColorSet |

---

## What Stays the Same

- Accent colors (`--hatchin-blue`, `--hatchin-green`, `--hatchin-orange`) — identical in both modes
- Agent bubble backgrounds — transparent overlays work on both
- Agent gradient pills — colorful gradients work on both
- CTA button colors — `hatchin-blue` on both
- All Shadcn component behavior — they already use CSS variables
- Animation keyframes — glow effects use `hatchin-blue` rgba which works on both

---

*Spec written: 2026-03-19*
