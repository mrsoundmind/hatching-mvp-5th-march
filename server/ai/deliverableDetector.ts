/**
 * Organic Deliverable Detector — identifies when a conversation warrants a deliverable.
 *
 * Two-stage classification:
 * 1. Intent detection — does this message imply a deliverable should be created?
 * 2. Proposal — if yes, build a confirmation card for the user.
 *
 * Conservative thresholds to minimize false positives. Never auto-creates.
 */

import { getDeliverableTypesForRole } from '@shared/deliverableTypes';

export interface DeliverableProposal {
  detected: true;
  type: string;
  title: string;
  description: string;
  agentRole: string;
  confidence: number;
}

export interface NoDetection {
  detected: false;
}

export type DetectionResult = DeliverableProposal | NoDetection;

/**
 * Explicit request patterns — high confidence.
 */
const EXPLICIT_PATTERNS: Array<{ pattern: RegExp; type: string; role: string; titleExtractor: (match: RegExpMatchArray) => string }> = [
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:prd|product\s+requirements?\s+(?:doc(?:ument)?)?)/i, type: 'prd', role: 'Product Manager', titleExtractor: () => 'Product Requirements Document' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:tech(?:nical)?\s+spec(?:ification)?)/i, type: 'tech-spec', role: 'Backend Developer', titleExtractor: () => 'Technical Specification' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:design\s+brief)/i, type: 'design-brief', role: 'Product Designer', titleExtractor: () => 'Design Brief' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:go[\s-]to[\s-]market|gtm)\s+(?:plan|strategy)/i, type: 'gtm-plan', role: 'Growth Marketer', titleExtractor: () => 'Go-to-Market Plan' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:blog\s+post)/i, type: 'blog-post', role: 'Content Writer', titleExtractor: () => 'Blog Post' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:landing\s+page\s+copy)/i, type: 'landing-copy', role: 'Copywriter', titleExtractor: () => 'Landing Page Copy' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:content\s+calendar)/i, type: 'content-calendar', role: 'Social Media Manager', titleExtractor: () => 'Content Calendar' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:an?\s+)?(?:email\s+sequence|drip\s+campaign)/i, type: 'email-sequence', role: 'Email Specialist', titleExtractor: () => 'Email Sequence' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:competitive\s+analysis)/i, type: 'competitive-analysis', role: 'Business Analyst', titleExtractor: () => 'Competitive Analysis' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:project\s+plan|sprint\s+breakdown)/i, type: 'project-plan', role: 'Product Manager', titleExtractor: () => 'Project Plan' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:market\s+research)/i, type: 'market-research', role: 'Business Analyst', titleExtractor: () => 'Market Research Report' },
  { pattern: /(?:write|create|draft|make)\s+(?:me\s+)?(?:a\s+)?(?:seo\s+(?:brief|strategy|plan))/i, type: 'seo-brief', role: 'SEO Specialist', titleExtractor: () => 'SEO Strategy Brief' },
];

/**
 * Organic signal patterns — lower confidence, need additional context.
 */
const ORGANIC_SIGNALS: Array<{ pattern: RegExp; type: string; role: string; confidence: number }> = [
  { pattern: /(?:let'?s|we\s+should|need\s+to)\s+(?:document|write\s+up|formalize|spec\s+out)/i, type: 'custom', role: 'Product Manager', confidence: 0.6 },
  { pattern: /(?:can\s+you|could\s+you)\s+(?:put\s+together|pull\s+together|assemble)\s+(?:a|the)\s+(?:plan|doc|brief|report)/i, type: 'custom', role: 'Product Manager', confidence: 0.7 },
  { pattern: /(?:i\s+think\s+we\s+(?:have|need)\s+enough\s+to)\s+(?:write|start|create)/i, type: 'custom', role: 'Product Manager', confidence: 0.55 },
];

/**
 * Detect if a message warrants a deliverable proposal.
 * Stage 1: Pattern matching for explicit and organic signals.
 */
export function detectDeliverableIntent(
  message: string,
  agentRole?: string,
): DetectionResult {
  // Stage 1: Check explicit patterns (high confidence)
  for (const pattern of EXPLICIT_PATTERNS) {
    const match = message.match(pattern.pattern);
    if (match) {
      return {
        detected: true,
        type: pattern.type,
        title: pattern.titleExtractor(match),
        description: message.slice(0, 200),
        agentRole: pattern.role,
        confidence: 0.9,
      };
    }
  }

  // Stage 2: Check organic signals (lower confidence)
  for (const signal of ORGANIC_SIGNALS) {
    if (signal.pattern.test(message)) {
      // If we know the agent's role, use their deliverable types
      const role = agentRole || signal.role;
      const types = getDeliverableTypesForRole(role);
      const bestType = types[0];

      return {
        detected: true,
        type: bestType.type,
        title: bestType.label,
        description: message.slice(0, 200),
        agentRole: role,
        confidence: signal.confidence,
      };
    }
  }

  return { detected: false };
}

/**
 * Build a proposal card message for the chat.
 * This is what the agent posts when it detects a deliverable opportunity.
 */
export function buildProposalMessage(proposal: DeliverableProposal): string {
  return `I think this is a great moment to formalize what we've discussed. Ready to write this up as a **${proposal.title}**? I'll create a structured document you can review and iterate on.\n\nJust say "go ahead" and I'll get started.`;
}
