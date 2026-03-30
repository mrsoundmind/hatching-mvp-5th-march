/**
 * compare-intelligence-upgrade.ts
 *
 * Demonstrates the BEFORE vs AFTER impact of the intelligence upgrade
 * on agent quality. Shows how much richer the system prompt becomes
 * when roleRegistry deep-personality fields + roleIntelligence are injected.
 *
 * Usage:  npx tsx scripts/compare-intelligence-upgrade.ts
 */

import { ROLE_DEFINITIONS, type RoleDefinition } from '../shared/roleRegistry.js';
import { getRoleIntelligence, type RoleIntelligence } from '../shared/roleIntelligence.js';

// ── ANSI Colors ──────────────────────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgBlue:  '\x1b[44m',
  bgGreen: '\x1b[42m',
};

function header(text: string): void {
  const bar = '='.repeat(72);
  console.log(`\n${C.bold}${C.cyan}${bar}${C.reset}`);
  console.log(`${C.bold}${C.cyan}  ${text}${C.reset}`);
  console.log(`${C.bold}${C.cyan}${bar}${C.reset}\n`);
}

function subheader(text: string): void {
  console.log(`\n${C.bold}${C.yellow}--- ${text} ---${C.reset}\n`);
}

function label(key: string, value: string | number): void {
  console.log(`  ${C.dim}${key}:${C.reset} ${value}`);
}

function len(s: string | undefined | null): number {
  return s ? s.length : 0;
}

// ── Jaccard Similarity ───────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ── Build prompt sections (mirrors openaiService.ts logic) ───────────────────

function buildProfessionalDepthSection(def: RoleDefinition): string {
  if (!def.domainDepth && !def.criticalThinking && !def.negativeHandling && !def.collaborationStyle) {
    return '';
  }
  let section = '\n--- PROFESSIONAL DEPTH ---';
  if (def.domainDepth)         section += `\nDomain depth: ${def.domainDepth}`;
  if (def.criticalThinking)    section += `\nCritical thinking: ${def.criticalThinking}`;
  if (def.negativeHandling)    section += `\nHow you push back: ${def.negativeHandling}`;
  if (def.collaborationStyle)  section += `\nHow you collaborate: ${def.collaborationStyle}`;
  section += '\n--- END PROFESSIONAL DEPTH ---';
  return section;
}

function buildDomainIntelligenceSection(intel: RoleIntelligence | undefined): string {
  if (!intel) return '';
  return `\n--- DOMAIN INTELLIGENCE ---\nHow you reason: ${intel.reasoningPattern}\nYour output standard: ${intel.outputStandards}\n--- END DOMAIN INTELLIGENCE ---`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const TARGET_ROLES = [
  'Product Manager',
  'Backend Developer',
  'UX Designer',
  'Growth Marketer',
  'Data Scientist',
];

interface RoleAnalysis {
  role: string;
  beforeChars: number;
  afterChars: number;
  multiplier: number;
  uniqueFieldsAdded: number;
  combinedPromptText: string;
}

const analyses: RoleAnalysis[] = [];

header('HATCHIN INTELLIGENCE UPGRADE: BEFORE vs AFTER');

console.log(`${C.dim}This script compares agent prompt richness before and after the`);
console.log(`intelligence upgrade (roleRegistry deep-personality + roleIntelligence).${C.reset}`);
console.log(`${C.dim}Analyzing ${TARGET_ROLES.length} diverse roles...${C.reset}`);

for (const roleName of TARGET_ROLES) {
  const def = ROLE_DEFINITIONS.find(d => d.role === roleName);
  if (!def) {
    console.log(`${C.red}  [SKIP] Role "${roleName}" not found in ROLE_DEFINITIONS${C.reset}`);
    continue;
  }
  const intel = getRoleIntelligence(roleName);

  subheader(`${def.emoji}  ${roleName} (${def.characterName})`);

  // ── BEFORE: only voicePrompt existed ──
  const beforeChars = len(def.voicePrompt);
  console.log(`${C.bold}${C.red}  BEFORE (old system — voicePrompt only)${C.reset}`);
  label('voicePrompt length', `${beforeChars} chars`);

  // ── AFTER: all personality + intelligence fields ──
  const afterFields: { name: string; chars: number }[] = [
    { name: 'voicePrompt',         chars: len(def.voicePrompt) },
    { name: 'negativeHandling',    chars: len(def.negativeHandling) },
    { name: 'criticalThinking',    chars: len(def.criticalThinking) },
    { name: 'collaborationStyle',  chars: len(def.collaborationStyle) },
    { name: 'domainDepth',         chars: len(def.domainDepth) },
  ];
  if (intel) {
    afterFields.push(
      { name: 'reasoningPattern',  chars: len(intel.reasoningPattern) },
      { name: 'outputStandards',   chars: len(intel.outputStandards) },
      { name: 'peerReviewLens',    chars: len(intel.peerReviewLens) },
      { name: 'handoffProtocol',   chars: len(intel.handoffProtocol.receives) + len(intel.handoffProtocol.passes) },
      { name: 'escalationRules',   chars: len(intel.escalationRules) },
    );
  }

  const afterChars = afterFields.reduce((sum, f) => sum + f.chars, 0);
  const uniqueFieldsAdded = afterFields.filter(f => f.name !== 'voicePrompt' && f.chars > 0).length;
  const multiplier = beforeChars > 0 ? afterChars / beforeChars : 0;

  console.log(`\n${C.bold}${C.green}  AFTER (upgraded system — full intelligence)${C.reset}`);
  for (const f of afterFields) {
    const color = f.name === 'voicePrompt' ? C.dim : C.green;
    const tag = f.name === 'voicePrompt' ? ' (existing)' : ' (NEW)';
    console.log(`  ${color}  ${f.name}: ${f.chars} chars${tag}${C.reset}`);
  }

  console.log(`\n  ${C.bold}Total intelligence surface area:${C.reset}`);
  label('Before', `${beforeChars} chars`);
  label('After',  `${afterChars} chars`);
  console.log(`  ${C.bold}${C.magenta}Multiplier: ${multiplier.toFixed(1)}x${C.reset}`);
  console.log(`  ${C.cyan}Unique fields added: ${uniqueFieldsAdded}${C.reset}`);

  // ── Show the actual injected sections ──
  const profDepth = buildProfessionalDepthSection(def);
  const domainIntel = buildDomainIntelligenceSection(intel);

  if (profDepth) {
    console.log(`\n  ${C.bold}${C.blue}Injected PROFESSIONAL DEPTH section:${C.reset}`);
    for (const line of profDepth.split('\n').filter(Boolean)) {
      console.log(`  ${C.dim}${line}${C.reset}`);
    }
  }

  if (domainIntel) {
    console.log(`\n  ${C.bold}${C.blue}Injected DOMAIN INTELLIGENCE section:${C.reset}`);
    for (const line of domainIntel.split('\n').filter(Boolean)) {
      console.log(`  ${C.dim}${line}${C.reset}`);
    }
  }

  const combinedPromptText = [
    def.voicePrompt,
    def.negativeHandling ?? '',
    def.criticalThinking ?? '',
    def.collaborationStyle ?? '',
    def.domainDepth ?? '',
    intel?.reasoningPattern ?? '',
    intel?.outputStandards ?? '',
    intel?.peerReviewLens ?? '',
    intel?.handoffProtocol.receives ?? '',
    intel?.handoffProtocol.passes ?? '',
    intel?.escalationRules ?? '',
  ].join(' ');

  analyses.push({
    role: roleName,
    beforeChars,
    afterChars,
    multiplier,
    uniqueFieldsAdded,
    combinedPromptText,
  });
}

// ── Uniqueness Check (Jaccard Similarity) ────────────────────────────────────

header('UNIQUENESS CHECK: Jaccard Similarity Between Roles');

console.log(`${C.dim}Lower similarity = more unique prompts per role (target: < 0.30)${C.reset}\n`);

const tokenSets = analyses.map(a => ({
  role: a.role,
  tokens: tokenize(a.combinedPromptText),
}));

const similarities: { pair: string; score: number }[] = [];

for (let i = 0; i < tokenSets.length; i++) {
  for (let j = i + 1; j < tokenSets.length; j++) {
    const score = jaccard(tokenSets[i].tokens, tokenSets[j].tokens);
    similarities.push({
      pair: `${tokenSets[i].role} <-> ${tokenSets[j].role}`,
      score,
    });
  }
}

// Sort by similarity descending
similarities.sort((a, b) => b.score - a.score);

for (const s of similarities) {
  const color = s.score < 0.20 ? C.green : s.score < 0.30 ? C.yellow : C.red;
  const bar = '#'.repeat(Math.round(s.score * 40));
  console.log(`  ${color}${s.score.toFixed(3)}${C.reset} ${C.dim}${bar}${C.reset}  ${s.pair}`);
}

const avgSimilarity = similarities.reduce((sum, s) => sum + s.score, 0) / similarities.length;
console.log(`\n  ${C.bold}Average pairwise Jaccard similarity: ${avgSimilarity.toFixed(3)}${C.reset}`);
console.log(`  ${avgSimilarity < 0.30 ? C.green + 'PASS' : C.red + 'WARN'}: Each role gets a ${avgSimilarity < 0.30 ? 'meaningfully unique' : 'somewhat overlapping'} prompt.${C.reset}`);

// ── Summary Table ────────────────────────────────────────────────────────────

header('SUMMARY TABLE');

const colRole   = 22;
const colBefore = 14;
const colAfter  = 14;
const colMult   = 12;
const colFields = 14;

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

const headerRow = `${C.bold}${pad('Role', colRole)} ${pad('Before (ch)', colBefore)} ${pad('After (ch)', colAfter)} ${pad('Multiplier', colMult)} ${pad('New Fields', colFields)}${C.reset}`;
const divider   = '-'.repeat(colRole + colBefore + colAfter + colMult + colFields + 4);

console.log(headerRow);
console.log(C.dim + divider + C.reset);

for (const a of analyses) {
  const multColor = a.multiplier >= 5 ? C.green : a.multiplier >= 3 ? C.yellow : C.red;
  console.log(
    `${pad(a.role, colRole)} ` +
    `${C.red}${pad(String(a.beforeChars), colBefore)}${C.reset} ` +
    `${C.green}${pad(String(a.afterChars), colAfter)}${C.reset} ` +
    `${multColor}${pad(a.multiplier.toFixed(1) + 'x', colMult)}${C.reset} ` +
    `${C.cyan}${pad(String(a.uniqueFieldsAdded), colFields)}${C.reset}`
  );
}

console.log(C.dim + divider + C.reset);

// Totals
const totalBefore = analyses.reduce((s, a) => s + a.beforeChars, 0);
const totalAfter  = analyses.reduce((s, a) => s + a.afterChars, 0);
const totalMult   = totalBefore > 0 ? totalAfter / totalBefore : 0;
const totalFields = analyses.reduce((s, a) => s + a.uniqueFieldsAdded, 0);

console.log(
  `${C.bold}${pad('TOTAL', colRole)} ` +
  `${C.red}${pad(String(totalBefore), colBefore)}${C.reset} ` +
  `${C.green}${pad(String(totalAfter), colAfter)}${C.reset} ` +
  `${C.magenta}${pad(totalMult.toFixed(1) + 'x', colMult)}${C.reset} ` +
  `${C.cyan}${pad(String(totalFields), colFields)}${C.reset}`
);

// ── Verdict ──────────────────────────────────────────────────────────────────

header('VERDICT');

console.log(`  The intelligence upgrade expanded agent prompt richness by ${C.bold}${C.green}${totalMult.toFixed(1)}x${C.reset} on average.`);
console.log(`  ${C.bold}${totalFields}${C.reset} new unique intelligence fields were added across ${analyses.length} roles.`);
console.log(`  Average pairwise similarity is ${C.bold}${avgSimilarity.toFixed(3)}${C.reset} — ${avgSimilarity < 0.30 ? 'each role is meaningfully differentiated.' : 'some overlap exists between roles.'}`);
console.log();

if (totalMult >= 4 && avgSimilarity < 0.30) {
  console.log(`  ${C.bgGreen}${C.bold} EXCELLENT ${C.reset} The upgrade delivers substantial, differentiated intelligence per role.`);
} else if (totalMult >= 3) {
  console.log(`  ${C.bgBlue}${C.bold} GOOD ${C.reset} Significant improvement with room for further differentiation.`);
} else {
  console.log(`  ${C.yellow}${C.bold} NEEDS WORK ${C.reset} The intelligence surface area could be expanded further.`);
}

console.log();
