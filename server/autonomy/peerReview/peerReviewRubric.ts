import { evaluateSafetyScore } from '../../ai/safety.js';
import { getRoleIntelligence } from '@shared/roleIntelligence';

export type HallucinationRiskLevel = 'low' | 'medium' | 'high';
export type PassFail = 'pass' | 'fail';

export interface PeerReviewRubric {
  reviewerHatchId: string;
  hallucinationRisk: HallucinationRiskLevel;
  roleFit: PassFail;
  usefulness: PassFail;
  contradictions: string[];
  missingQuestions: string[];
  fixSuggestions: string[];
  reviewLens?: string;
}

const FACTUAL_CLAIM_PATTERN = /\b(according to|research shows|always|never|guaranteed|proven|statistically|exactly \d+%|forecast)\b/i;

/**
 * Role-specific review keywords derived from each role's peerReviewLens.
 * If the draft doesn't address concerns this reviewer cares about, they flag it.
 */
function generateRoleSpecificChecks(
  reviewerRole: string,
  lowerDraft: string,
  lowerUser: string,
  peerReviewLens: string | undefined,
): { missingQuestions: string[]; fixSuggestions: string[] } {
  const missingQuestions: string[] = [];
  const fixSuggestions: string[] = [];

  if (!peerReviewLens) return { missingQuestions, fixSuggestions };

  const lensLower = peerReviewLens.toLowerCase();

  // Engineering roles check for technical rigour
  if (/edge case|failure mode|error handling|scalability/i.test(lensLower)) {
    if (/build|implement|create|deploy|architecture/i.test(lowerUser) && !/error|fail|edge|rollback|scale/i.test(lowerDraft)) {
      missingQuestions.push(`${reviewerRole} review: What happens when this fails? Edge cases and error handling not addressed.`);
      fixSuggestions.push('Address failure modes and edge cases before committing to implementation.');
    }
  }

  // Design roles check for user impact
  if (/user experience|accessibility|cognitive load|usability/i.test(lensLower)) {
    if (/design|ui|ux|interface|flow|screen/i.test(lowerUser) && !/user|accessible|wcag|intuitive|friction/i.test(lowerDraft)) {
      missingQuestions.push(`${reviewerRole} review: How does this impact the user experience? Accessibility and usability not addressed.`);
      fixSuggestions.push('Evaluate user impact, accessibility compliance, and cognitive load.');
    }
  }

  // Data roles check for evidence and methodology
  if (/statistical|bias|sample size|methodology|metric/i.test(lensLower)) {
    if (/data|metric|analysis|trend|number|percent/i.test(lowerUser + ' ' + lowerDraft) && !/sample|confidence|bias|methodology|assumption/i.test(lowerDraft)) {
      missingQuestions.push(`${reviewerRole} review: What's the methodology? Statistical validity and potential biases not addressed.`);
      fixSuggestions.push('State sample size, confidence level, and potential biases in any data claims.');
    }
  }

  // Strategy/PM roles check for alignment and trade-offs
  if (/trade-off|priority|stakeholder|outcome|alignment/i.test(lensLower)) {
    if (/strategy|plan|decision|priority|roadmap/i.test(lowerUser) && !/trade-off|risk|assumption|stakeholder|outcome/i.test(lowerDraft)) {
      missingQuestions.push(`${reviewerRole} review: What are the trade-offs? Assumptions and stakeholder alignment not addressed.`);
      fixSuggestions.push('Explicitly state trade-offs, key assumptions, and who needs to align.');
    }
  }

  // Marketing/content roles check for audience fit
  if (/audience|brand|tone|conversion|messaging/i.test(lensLower)) {
    if (/content|copy|campaign|message|brand|marketing/i.test(lowerUser) && !/audience|tone|brand|target|persona/i.test(lowerDraft)) {
      missingQuestions.push(`${reviewerRole} review: Who is this for? Audience targeting and brand alignment not addressed.`);
      fixSuggestions.push('Clarify target audience and ensure messaging aligns with brand voice.');
    }
  }

  // QA roles check for testability
  if (/test|coverage|regression|acceptance criteria/i.test(lensLower)) {
    if (/implement|build|feature|change|fix/i.test(lowerUser) && !/test|verify|acceptance|criteria|regression/i.test(lowerDraft)) {
      missingQuestions.push(`${reviewerRole} review: How do we verify this works? No testing strategy or acceptance criteria mentioned.`);
      fixSuggestions.push('Define acceptance criteria and testing strategy before implementation.');
    }
  }

  // Ops roles check for process impact
  if (/process|bottleneck|handoff|dependency|operational/i.test(lensLower)) {
    if (/process|workflow|team|operation|handoff/i.test(lowerUser) && !/bottleneck|dependency|handoff|timeline|owner/i.test(lowerDraft)) {
      missingQuestions.push(`${reviewerRole} review: What's the operational impact? Dependencies and bottlenecks not addressed.`);
      fixSuggestions.push('Map dependencies, identify bottleneck risks, and assign owners.');
    }
  }

  return { missingQuestions: missingQuestions.slice(0, 2), fixSuggestions: fixSuggestions.slice(0, 2) };
}

export function evaluatePeerReviewRubric(input: {
  reviewerHatchId: string;
  reviewerRole: string;
  userMessage: string;
  draftResponse: string;
  projectName?: string;
  canonHints?: string[];
  peerReviewLens?: string;
}): PeerReviewRubric {
  const safety = evaluateSafetyScore({
    userMessage: input.userMessage,
    draftResponse: input.draftResponse,
    conversationMode: 'project',
    projectName: input.projectName,
  });

  const contradictions: string[] = [];
  const missingQuestions: string[] = [];
  const fixSuggestions: string[] = [];

  const lowerDraft = input.draftResponse.toLowerCase();
  const lowerUser = input.userMessage.toLowerCase();

  if (input.canonHints && input.canonHints.length > 0) {
    for (const hint of input.canonHints) {
      const clue = hint.toLowerCase();
      if (!clue || clue.length < 6) continue;
      const keyword = clue.split(' ').slice(0, 3).join(' ');
      if (keyword && !lowerDraft.includes(keyword)) {
        contradictions.push(`Missing canon anchor: ${keyword}`);
      }
    }
  }

  if (FACTUAL_CLAIM_PATTERN.test(input.draftResponse) && !/source|evidence|assumption|depends/i.test(input.draftResponse)) {
    missingQuestions.push('Can we cite or verify the factual claim before presenting certainty?');
    fixSuggestions.push('Add evidence qualifiers and avoid absolute certainty without citations.');
  }

  if (/launch|deploy|send to all|production/i.test(lowerUser) && !/risk|rollback|guardrail|approval/i.test(lowerDraft)) {
    missingQuestions.push('What rollback and approval gate should be required before execution?');
    fixSuggestions.push('Add explicit approval gate and rollback plan for high-impact actions.');
  }

  if (safety.scopeRisk >= 0.35 && !/project|scope|isolation/i.test(lowerDraft)) {
    contradictions.push('Response does not explicitly guard project scope isolation.');
    fixSuggestions.push('State that cross-project memory/data access is blocked by design.');
  }

  if (!/next step|action|owner|timeline|task/i.test(lowerDraft)) {
    fixSuggestions.push('Add concrete next actions with owner and timeline.');
  }

  // Role-specific checks using peerReviewLens from roleIntelligence
  const reviewerIntelligence = getRoleIntelligence(input.reviewerRole);
  const lens = input.peerReviewLens ?? reviewerIntelligence?.peerReviewLens;
  const roleChecks = generateRoleSpecificChecks(input.reviewerRole, lowerDraft, lowerUser, lens);
  missingQuestions.push(...roleChecks.missingQuestions);
  fixSuggestions.push(...roleChecks.fixSuggestions);

  if (fixSuggestions.length > 7) {
    fixSuggestions.splice(7);
  }

  let hallucinationRisk: HallucinationRiskLevel = 'low';
  const aggregateRisk = Math.max(safety.hallucinationRisk, safety.executionRisk, safety.scopeRisk);
  if (aggregateRisk >= 0.7 || contradictions.length >= 2) {
    hallucinationRisk = 'high';
  } else if (aggregateRisk >= 0.35 || missingQuestions.length > 0) {
    hallucinationRisk = 'medium';
  }

  // Role fit: pass if the reviewer has relevant intelligence for this domain, not just "manager"
  const roleFit: PassFail = reviewerIntelligence ? 'pass' : (
    input.reviewerRole.toLowerCase().includes('manager') ||
    /strategy|plan|task|execution|owner/i.test(input.draftResponse)
      ? 'pass'
      : 'fail'
  );

  const usefulness: PassFail = fixSuggestions.length > 0 ? 'pass' : 'fail';

  return {
    reviewerHatchId: input.reviewerHatchId,
    hallucinationRisk,
    roleFit,
    usefulness,
    contradictions,
    missingQuestions,
    fixSuggestions,
    reviewLens: lens,
  };
}
