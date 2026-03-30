/**
 * SAFE-04: Trust-Adjusted Safety Thresholds
 *
 * Agents with higher trust scores get relaxed thresholds:
 * - clarificationRequiredRisk increases (higher risk tolerated before blocking)
 * - peerReviewTrigger increases (less peer review needed)
 *
 * Maximum adjustment is capped to prevent fully unsupervised execution.
 */

import { AUTONOMOUS_SAFETY_THRESHOLDS } from '../../ai/safety.js';

export interface AdjustedThresholds {
  peerReviewTrigger: number;
  clarificationRequiredRisk: number;
}

// Maximum relaxation: thresholds can increase by up to this much
const MAX_PEER_REVIEW_BOOST = 0.15; // 0.35 → max 0.50
const MAX_CLARIFICATION_BOOST = 0.15; // 0.60 → max 0.75

/**
 * Get safety thresholds adjusted for an agent's trust score.
 *
 * trustScore 0.0 → no adjustment (baseline thresholds)
 * trustScore 0.5 → half of max boost applied
 * trustScore 1.0 → full max boost applied (still capped)
 */
export function getAdjustedThresholds(trustScore: number): AdjustedThresholds {
  const clampedTrust = Math.max(0, Math.min(1, trustScore));

  return {
    peerReviewTrigger:
      AUTONOMOUS_SAFETY_THRESHOLDS.peerReviewTrigger + clampedTrust * MAX_PEER_REVIEW_BOOST,
    clarificationRequiredRisk:
      AUTONOMOUS_SAFETY_THRESHOLDS.clarificationRequiredRisk +
      clampedTrust * MAX_CLARIFICATION_BOOST,
  };
}
