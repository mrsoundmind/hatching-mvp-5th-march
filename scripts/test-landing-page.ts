/**
 * test-landing-page.ts — Brand voice alignment tests for LandingPage.tsx
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(resolve("client/src/pages/LandingPage.tsx"), "utf-8");

if (!src.includes("AI teammates with real personalities")) {
  console.error('✗  Header must include clarifier: "AI teammates with real personalities"');
  process.exit(1);
}

console.log('✓  Header includes clarifier about AI teammates');
