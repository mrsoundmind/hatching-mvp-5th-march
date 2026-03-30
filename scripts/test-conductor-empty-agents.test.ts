import { describe, it, expect } from "vitest";
import { evaluateConductorDecision } from "../server/ai/conductor.js";

describe("evaluateConductorDecision — empty agents guard", () => {
  it("returns safe default decision when availableAgents is empty", () => {
    const result = evaluateConductorDecision({
      userMessage: "How should we design the API?",
      conversationMode: "project",
      availableAgents: [],
    });

    expect(result.decision.route).toBe("authority_default");
    expect(result.decision.reasons).toContain("no_agents_available");
    expect(result.primaryMatch).toBeUndefined();
    expect(result.fallbackMatches).toEqual([]);
  });
});
