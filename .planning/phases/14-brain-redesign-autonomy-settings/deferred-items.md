# Deferred Items — Phase 14

## Pre-existing TypeScript Errors (Out of Scope)

### sparkles.tsx missing @tsparticles dependencies

**File:** `client/src/components/ui/sparkles.tsx`
**Issue:** Cannot find module '@tsparticles/react', '@tsparticles/engine', '@tsparticles/slim'
**Type:** Pre-existing untracked file with missing npm dependencies
**Discovery:** Found during 14-01 Task 2 typecheck
**Impact:** Does not affect server-side changes or any plan 14 work
**Action needed:** Install @tsparticles/react @tsparticles/engine @tsparticles/slim or remove sparkles.tsx if unused
