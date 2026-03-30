/**
 * test-agent-pushback.ts — Validates that every role in the registry
 * has meaningful, role-specific pushback (negativeHandling) configured.
 *
 * Does NOT call an LLM — pure data validation against roleRegistry.
 */

import { ROLE_DEFINITIONS, type RoleDefinition } from "../shared/roleRegistry.js";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${(e as Error).message}`);
  }
}

// ── Test Data ────────────────────────────────────────────────────────────────

const ENGINEERING_ROLES = [
  "Backend Developer",
  "Software Engineer",
  "Technical Lead",
  "DevOps Engineer",
  "AI Developer",
  "UI Engineer",
];

const ENGINEERING_KEYWORDS = [
  "failure", "risk", "edge case", "error", "bug", "performance",
  "debt", "test", "scale", "security", "deploy", "rollback",
];

const DESIGN_ROLES = [
  "Product Designer",
  "UX Designer",
  "UI Designer",
  "Designer",
  "Creative Director",
];

const DESIGN_KEYWORDS = [
  "user", "accessibility", "usability", "experience", "friction",
  "evidence", "research", "cognitive", "interface", "visual",
  "design", "pattern", "creative", "brand", "mockup", "aesthetic",
];

const STRATEGY_PM_ROLES = [
  "Product Manager",
  "Business Analyst",
  "Business Strategist",
  "Operations Manager",
];

const STRATEGY_KEYWORDS = [
  "trade-off", "assumption", "stakeholder", "priority", "outcome",
  "decision", "evidence", "data", "metric", "risk", "strategic",
  "opportunity", "competitor", "ownership", "process", "bottleneck",
];

// ── Tests ────────────────────────────────────────────────────────────────────

console.log("\n🧪 Agent Pushback Validation\n");

console.log("1. Every role has negativeHandling (>30 chars):");
for (const def of ROLE_DEFINITIONS) {
  test(`${def.role} has negativeHandling`, () => {
    assert(
      def.negativeHandling && def.negativeHandling.length > 30,
      `negativeHandling is missing or too short (${def.negativeHandling?.length ?? 0} chars)`,
    );
  });
}

console.log("\n2. Engineering roles have domain-relevant pushback:");
for (const roleName of ENGINEERING_ROLES) {
  test(`${roleName} pushback mentions engineering concerns`, () => {
    const def = ROLE_DEFINITIONS.find((r) => r.role === roleName);
    assert(def, `Role "${roleName}" not found in ROLE_DEFINITIONS`);
    const text = (def as RoleDefinition).negativeHandling?.toLowerCase() ?? "";
    const hasKeyword = ENGINEERING_KEYWORDS.some((kw) => text.includes(kw));
    assert(
      hasKeyword,
      `negativeHandling does not contain any of: ${ENGINEERING_KEYWORDS.join(", ")}`,
    );
  });
}

console.log("\n3. Design roles have domain-relevant pushback:");
for (const roleName of DESIGN_ROLES) {
  test(`${roleName} pushback mentions design concerns`, () => {
    const def = ROLE_DEFINITIONS.find((r) => r.role === roleName);
    assert(def, `Role "${roleName}" not found in ROLE_DEFINITIONS`);
    const text = (def as RoleDefinition).negativeHandling?.toLowerCase() ?? "";
    const hasKeyword = DESIGN_KEYWORDS.some((kw) => text.includes(kw));
    assert(
      hasKeyword,
      `negativeHandling does not contain any of: ${DESIGN_KEYWORDS.join(", ")}`,
    );
  });
}

console.log("\n4. Strategy/PM roles have domain-relevant pushback:");
for (const roleName of STRATEGY_PM_ROLES) {
  test(`${roleName} pushback mentions strategy concerns`, () => {
    const def = ROLE_DEFINITIONS.find((r) => r.role === roleName);
    assert(def, `Role "${roleName}" not found in ROLE_DEFINITIONS`);
    const text = (def as RoleDefinition).negativeHandling?.toLowerCase() ?? "";
    const hasKeyword = STRATEGY_KEYWORDS.some((kw) => text.includes(kw));
    assert(
      hasKeyword,
      `negativeHandling does not contain any of: ${STRATEGY_KEYWORDS.join(", ")}`,
    );
  });
}

console.log("\n5. No duplicate pushback strings:");
test("All negativeHandling strings are unique", () => {
  const seen = new Map<string, string>();
  for (const def of ROLE_DEFINITIONS) {
    if (!def.negativeHandling) continue;
    const existing = seen.get(def.negativeHandling);
    assert(
      !existing,
      `"${def.role}" has identical negativeHandling as "${existing}"`,
    );
    seen.set(def.negativeHandling, def.role);
  }
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${failed === 0 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}\n`);

process.exit(failed > 0 ? 1 : 0);
