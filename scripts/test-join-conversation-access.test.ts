/**
 * TDD tests for conversationOwnedByUser fallback behavior.
 *
 * Regression: join_conversation returns FORBIDDEN for brand-new projects
 * that have no conversation in DB yet, because conversationOwnedByUser only
 * checks existing conversation records and does not fall back to project
 * ownership via the conversationId format (project:{id}, team:{pid}:{tid}).
 *
 * These tests import the extracted helper from its canonical location.
 * They are RED until the helper is created.
 */
import { describe, it, expect } from "vitest";

// This import will fail (module not found) until we create the helper.
// That failure IS the RED state.
import { checkConversationAccess } from "../server/utils/conversationAccess.js";

const PROJECT_ID = "proj-abc-123";
const OTHER_ID = "proj-xyz-999";
const noConversations = async (_pid: string) => [];

describe("checkConversationAccess — existing conversation record", () => {
  it("returns true when conversation record exists under owned project", async () => {
    const ownedProjectIds = new Set([PROJECT_ID]);
    const getConversations = async (pid: string) =>
      pid === PROJECT_ID ? [{ id: `project:${PROJECT_ID}` }] : [];

    const result = await checkConversationAccess(
      `project:${PROJECT_ID}`, ownedProjectIds, getConversations,
    );
    expect(result).toBe(true);
  });

  it("returns false for a project the user does not own", async () => {
    const ownedProjectIds = new Set([PROJECT_ID]);
    const result = await checkConversationAccess(
      `project:${OTHER_ID}`, ownedProjectIds, noConversations,
    );
    expect(result).toBe(false);
  });
});

describe("checkConversationAccess — brand-new project (no conversation record yet)", () => {
  it("returns true via project-format fallback when no conversation record exists", async () => {
    const ownedProjectIds = new Set([PROJECT_ID]);
    const result = await checkConversationAccess(
      `project:${PROJECT_ID}`, ownedProjectIds, noConversations,
    );
    expect(result).toBe(true);
  });

  it("returns true via team-format fallback when no conversation record exists", async () => {
    const ownedProjectIds = new Set([PROJECT_ID]);
    const result = await checkConversationAccess(
      `team:${PROJECT_ID}:team-t1`, ownedProjectIds, noConversations,
    );
    expect(result).toBe(true);
  });

  it("returns true via agent-format fallback when no conversation record exists", async () => {
    const ownedProjectIds = new Set([PROJECT_ID]);
    const result = await checkConversationAccess(
      `agent:${PROJECT_ID}:agent-a1`, ownedProjectIds, noConversations,
    );
    expect(result).toBe(true);
  });

  it("returns false for unowned project even without conversation record", async () => {
    const ownedProjectIds = new Set([PROJECT_ID]);
    const result = await checkConversationAccess(
      `project:${OTHER_ID}`, ownedProjectIds, noConversations,
    );
    expect(result).toBe(false);
  });

  it("returns false for an unparseable conversationId", async () => {
    const ownedProjectIds = new Set([PROJECT_ID]);
    const result = await checkConversationAccess(
      "not-a-valid-id", ownedProjectIds, noConversations,
    );
    expect(result).toBe(false);
  });
});
