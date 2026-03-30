// TDD tests for HandoffOrchestrator — Phase 7 Plan 01
import { describe, it, expect } from "vitest";

describe("handoffOrchestrator — MAX_HANDOFF_HOPS guard", () => {
  it("exports MAX_HANDOFF_HOPS constant with default value of 4", async () => {
    const { MAX_HANDOFF_HOPS } = await import(
      "../server/autonomy/config/policies.js"
    );
    expect(MAX_HANDOFF_HOPS).toBe(4);
  });
});
