/**
 * Theme Task 6: Page components must use design-system tokens instead of hardcoded colors.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PAGES_DIR = path.resolve(__dirname, "../client/src/pages");
const COMPONENTS_DIR = path.resolve(__dirname, "../client/src/components");
const DEVTOOLS_DIR = path.resolve(__dirname, "../client/src/devtools");

function readPage(filename: string): string {
  return fs.readFileSync(path.join(PAGES_DIR, filename), "utf-8");
}

function readComponent(filename: string): string {
  return fs.readFileSync(path.join(COMPONENTS_DIR, filename), "utf-8");
}

function readDevtool(filename: string): string {
  return fs.readFileSync(path.join(DEVTOOLS_DIR, filename), "utf-8");
}

describe("not-found.tsx theme tokens", () => {
  it("uses bg-background instead of bg-gray-50 and text-foreground instead of text-gray-900", () => {
    const src = readPage("not-found.tsx");
    expect(src).not.toContain("bg-gray-50");
    expect(src).toContain("bg-background");
    expect(src).not.toContain("text-gray-900");
    expect(src).toContain("text-foreground");
    expect(src).not.toContain("text-gray-600");
    expect(src).toContain("text-muted-foreground");
  });
});

describe("MayaChat.tsx theme tokens", () => {
  it("replaces all hardcoded gray colors with semantic design tokens", () => {
    const src = readPage("MayaChat.tsx");
    expect(src).not.toContain("bg-gray-900");
    expect(src).not.toContain("bg-gray-800");
    expect(src).not.toContain("bg-gray-700");
    expect(src).not.toContain("border-gray-700");
    expect(src).not.toContain("border-gray-800");
    expect(src).not.toContain("border-gray-600");
    expect(src).not.toContain("text-gray-400");
    expect(src).not.toContain("text-gray-300");
    expect(src).not.toContain("text-gray-500");
    expect(src).not.toContain("text-gray-100");
    expect(src).not.toContain("bg-[#2A2D33]");
    expect(src).not.toContain("border-[#43444B]");
    expect(src).not.toContain("text-[#F1F1F3]");
    expect(src).not.toContain("placeholder-[#A6A7AB]");
    expect(src).toContain("bg-background");
    expect(src).toContain("text-foreground");
    expect(src).toContain("text-muted-foreground");
    expect(src).toContain("border-border");
    expect(src).toContain("bg-hatchin-panel");
  });
});

describe("onboarding.tsx theme tokens", () => {
  it("replaces hardcoded bg and text colors with semantic design tokens", () => {
    const src = readPage("onboarding.tsx");
    expect(src).not.toContain("bg-[#0A0A0A]");
    expect(src).toContain("bg-background");
    expect(src).not.toContain("text-slate-400");
    expect(src).not.toContain("text-gray-400");
    expect(src).not.toContain("text-gray-300");
    // text-white should only appear on accent buttons with bg-white
    const lines = src.split("\\n");
    expect(src).toContain("text-foreground");
    expect(src).toContain("text-muted-foreground");
  });
});

describe("login.tsx theme tokens", () => {
  it("replaces hardcoded bg and text colors with semantic design tokens", () => {
    const src = readPage("login.tsx");
    expect(src).not.toContain("bg-[#030303]");
    expect(src).toContain("bg-background");
    expect(src).not.toContain("text-slate-400");
    expect(src).not.toContain("text-slate-500");
    expect(src).not.toContain("bg-slate-900 ");
    expect(src).toContain("text-foreground");
    expect(src).toContain("text-muted-foreground");
  });
});

describe("LandingPage.tsx theme tokens", () => {
  it("replaces hardcoded slate/gray text and bg colors with semantic tokens", () => {
    const src = readPage("LandingPage.tsx");
    expect(src).not.toContain("text-slate-200");
    expect(src).not.toContain("text-slate-300");
    expect(src).not.toContain("text-slate-400");
    expect(src).not.toContain("text-slate-500");
    expect(src).not.toContain("text-slate-600");
    expect(src).not.toContain("bg-slate-800/30");
    expect(src).not.toContain("bg-slate-800/40");
    expect(src).not.toContain("bg-slate-900/60");
    expect(src).not.toContain("border-slate-700");
    expect(src).not.toContain("border-slate-800");
    expect(src).toContain("text-foreground");
    expect(src).toContain("text-muted-foreground");
    expect(src).toContain("bg-indigo-50 dark:bg-[#131724]");
    expect(src).toContain("bg-emerald-50 dark:bg-[#111A18]");
    expect(src).toContain("bg-fuchsia-50 dark:bg-[#1A121F]");
  });
});

describe("autonomyDashboard.tsx theme tokens", () => {
  it("replaces hardcoded hex colors with semantic design tokens", () => {
    const src = readDevtool("autonomyDashboard.tsx");
    expect(src).not.toContain("bg-[#0B0F1A]");
    expect(src).not.toContain("text-[#E7ECF6]");
    expect(src).not.toContain("text-[#9BA7C0]");
    expect(src).toContain("bg-background");
    expect(src).toContain("text-foreground");
    expect(src).toContain("text-muted-foreground");
  });
});

describe("ThreadContainer.tsx theme tokens", () => {
  it("replaces hardcoded gray colors with semantic design tokens", () => {
    const src = readComponent("ThreadContainer.tsx");
    expect(src).not.toContain("bg-gray-800");
    expect(src).not.toContain("bg-gray-700");
    expect(src).not.toContain("border-gray-600");
    expect(src).not.toContain("text-gray-300");
    expect(src).not.toContain("text-gray-400");
    expect(src).not.toContain("hover:text-white");
    expect(src).toContain("text-muted-foreground");
    expect(src).toContain("text-foreground");
  });
});

describe("OnboardingSteps.tsx theme tokens", () => {
  it("replaces hardcoded hex and gray colors with semantic design tokens", () => {
    const src = readComponent("OnboardingSteps.tsx");
    expect(src).not.toContain("bg-[#1A1D23]");
    expect(src).not.toContain("border-[#31343A]");
    expect(src).not.toContain("text-[#F1F1F3]");
    expect(src).not.toContain("text-[#A6A7AB]");
    expect(src).not.toContain("text-[#505153]");
    expect(src).not.toContain("bg-[#43444B]");
    expect(src).not.toContain("text-gray-300");
    expect(src).not.toContain("text-gray-400");
    expect(src).toContain("bg-hatchin-panel");
    expect(src).toContain("text-hatchin-text-bright");
    expect(src).toContain("text-muted-foreground");
  });
});

describe("PathSelectionModal.tsx theme tokens", () => {
  it("replaces hardcoded hex colors with semantic design tokens", () => {
    const src = readComponent("PathSelectionModal.tsx");
    expect(src).not.toContain("bg-[#1A1D23]");
    expect(src).not.toContain("border-[#31343A]");
    expect(src).not.toContain("text-[#F1F1F3]");
    expect(src).not.toContain("text-[#A6A7AB]");
    expect(src).not.toContain("from-[#23262B]");
    expect(src).not.toContain("to-[#1A1D23]");
    expect(src).not.toContain("bg-[#111318]");
    expect(src).toContain("bg-hatchin-panel");
    expect(src).toContain("text-hatchin-text-bright");
    expect(src).toContain("text-muted-foreground");
  });
});

describe("EggHatchingAnimation.tsx theme tokens", () => {
  it("replaces hardcoded background colors in radial gradients with CSS variables", () => {
    const src = readComponent("EggHatchingAnimation.tsx");
    expect(src).not.toContain("#1a1d28");
    expect(src).not.toContain("#0d0e14");
    expect(src).toContain("var(--hatchin-panel)");
    expect(src).toContain("var(--background)");
    expect(src).toContain("text-foreground");
    // Accent glow colors should remain
    expect(src).toContain("#6C82FF");
    expect(src).toContain("#9F7BFF");
    expect(src).toContain("#47DB9A");
  });
});

describe("bento-card.tsx theme tokens", () => {
  it("replaces hardcoded dark background hex colors with semantic tokens", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/ui/bento-card.tsx"),
      "utf-8"
    );
    expect(src).not.toContain("bg-[#0A0C13]");
    expect(src).not.toContain("bg-[#080A0F]");
    expect(src).not.toContain("bg-[#0e1018]");
    expect(src).not.toContain("from-[#080A0F]");
    expect(src).toContain("bg-background");
  });
});

describe("AppHeader.tsx theme tokens", () => {
  it("uses text-foreground for logo text instead of text-white", () => {
    const src = readComponent("AppHeader.tsx");
    expect(src).toContain("text-foreground");
    // Logo line should use text-foreground, not text-white
    const lines = src.split("\n");
    const logoLine = lines.find((l: string) => l.includes("Hatchin"));
    expect(logoLine).toContain("text-foreground");
    expect(logoLine).not.toContain("text-white");
  });
});
