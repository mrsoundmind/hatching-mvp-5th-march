// TDD tests for chat.ts checkForAutonomyTrigger and CenterPanel working indicator
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const chatSrc = () => fs.readFileSync(path.resolve("server/routes/chat.ts"), "utf8");
const centerSrc = () => fs.readFileSync(path.resolve("client/src/components/CenterPanel.tsx"), "utf8");

describe("chat.ts checkForAutonomyTrigger", () => {
  it("chat.ts contains checkForAutonomyTrigger function", () => {
    expect(chatSrc()).toContain("checkForAutonomyTrigger");
  });

  it("countAutonomyEventsForProjectToday is called BEFORE resolveAutonomyTrigger (EXEC-03 cost cap)", () => {
    const src = chatSrc();
    const capIdx = src.indexOf("countAutonomyEventsForProjectToday");
    const triggerIdx = src.indexOf("resolveAutonomyTrigger(");
    expect(capIdx).toBeGreaterThan(-1);
    expect(triggerIdx).toBeGreaterThan(-1);
    expect(capIdx).toBeLessThan(triggerIdx);
  });

  it("returns early when todayCount >= BUDGETS.maxBackgroundLlmCallsPerProjectPerDay", () => {
    expect(chatSrc()).toContain("todayCount >= BUDGETS.maxBackgroundLlmCallsPerProjectPerDay");
  });

  it("broadcasts background_execution_started when trigger fires", () => {
    expect(chatSrc()).toContain("background_execution_started");
  });

  it("checkForAutonomyTrigger call site appears after a streaming_completed broadcast", () => {
    const src = chatSrc();
    // Find the call site of checkForAutonomyTrigger (last occurrence = call, not definition)
    const triggerCallIdx = src.lastIndexOf("checkForAutonomyTrigger(");
    expect(triggerCallIdx).toBeGreaterThan(-1);
    // Find the streaming_completed that immediately precedes the trigger call
    const precedingCompletedIdx = src.lastIndexOf("'streaming_completed'", triggerCallIdx);
    expect(precedingCompletedIdx).toBeGreaterThan(-1);
    expect(triggerCallIdx).toBeGreaterThan(precedingCompletedIdx);
  });
});

describe("CenterPanel working indicator", () => {
  it("CenterPanel has isTeamWorking state", () => {
    expect(centerSrc()).toContain("isTeamWorking");
  });

  it("CenterPanel has teamWorkingTaskCount state", () => {
    expect(centerSrc()).toContain("teamWorkingTaskCount");
  });

  it("CenterPanel handles background_execution_started WS event", () => {
    expect(centerSrc()).toContain("background_execution_started");
  });

  it("CenterPanel renders 'Team is working' indicator text", () => {
    expect(centerSrc()).toContain("Team is working");
  });
});
