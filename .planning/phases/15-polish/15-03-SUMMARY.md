---
phase: 15-polish
plan: 03
status: done
---

# Plan 03 Summary: Approvals Tab Polish

## What changed

### ApprovalItem.tsx (already polished — verified)
- `premium-card` class on outer container
- `min-h-[44px] lg:min-h-auto` on both approve and reject buttons (44px mobile touch targets)
- `whileHover={{ scale: 1.02 }}` on approve button for emphasis
- Entry animation: `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`
- Badge pill: `text-[10px] font-semibold px-2 py-0.5 rounded-full`
- No `--hatchin-surface-hover` references
- All spacing on 4px grid

### TaskPipelineView.tsx
- **Stage colors aligned to design system**: replaced hardcoded `#f59e0b` (review) with `var(--hatchin-orange)`, changed In Progress from orange to `var(--hatchin-blue)` per plan spec
- **Row hover states**: each stage label wrapped in `motion.div` with `whileHover={{ backgroundColor: 'var(--hatchin-surface-elevated)' }}`
- **Unified section header**: updated to `text-[11px]`, `tracking-wider`, `mb-3` matching design system pattern
- **Spacing**: gap-x reduced from 3 to 1 to accommodate hover padding on label items

### approvalUtils.ts
- In Progress dot class updated from `bg-[var(--hatchin-orange)]` to `bg-[var(--hatchin-blue)]` for consistency with STAGE_COLORS

## Verification
- TypeScript typecheck: zero errors
- All CSS variable references point to defined variables (no raw hex colors in stage mapping)

## Files modified
- `client/src/components/sidebar/TaskPipelineView.tsx`
- `client/src/components/sidebar/approvalUtils.ts`
- `client/src/components/sidebar/ApprovalItem.tsx` (verified, no changes needed)
