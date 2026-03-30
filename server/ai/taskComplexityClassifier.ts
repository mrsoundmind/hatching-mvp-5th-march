/**
 * Heuristic message complexity classifier — no LLM call.
 * Used to route messages to cheap/expensive models and set adaptive maxTokens.
 */

export type MessageComplexity = 'simple' | 'standard' | 'complex';

const GREETING_PATTERNS = /^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|sure|yes|no|yep|nope|cool|nice|great|got it|sounds good|perfect|agreed|exactly|absolutely|definitely|right|correct|alright|fine|good|done|noted)\s*[.!?]*$/i;
const ACK_PATTERNS = /^(👍|👎|✅|❌|🔥|💯|🙏|😊|😂|🎉|lol|haha|lmao|😍|🤔|💪|👏|🙌|❤️|💜)\s*$/;

// Short messages that actually need a real answer — never route to simple
const ACTION_VERBS = /^(explain|describe|build|create|write|design|fix|implement|refactor|help|tell|show|give|make|set up|configure|debug|test|add|remove|update|change|improve|optimize|suggest|recommend|outline|draft|generate|list|summarize|break down)/i;
const QUESTION_STARTERS = /^(what|who|where|when|why|how|is|are|can|could|would|should|do|does|did|will|which|whose|whom)/i;
const TECHNICAL_KEYWORDS = /\b(api|database|schema|migration|deploy|architecture|algorithm|performance|optimization|scalable|infrastructure|security|encryption|authentication|middleware|microservice|kubernetes|docker|ci\/cd|refactor|backend|frontend|server|client|endpoint|webhook|websocket|component|function|class|module|testing|bug|error|crash|route|query|index|cache|proxy|ssl|dns|cors|jwt|oauth|token|config|env|log|monitor|pipeline|build|bundle|compile|lint|typescript|react|node|express|postgres|redis|stripe|llm|prompt|model)\b/i;
const ANALYSIS_KEYWORDS = /\b(analyze|compare|evaluate|review|assess|audit|breakdown|deep dive|trade-?off|pros and cons|implications|strategy|roadmap|plan|prioritize|estimate|forecast|investigate|diagnose|research|benchmark|profile|measure|scope|define|architect|propose|justify|critique|validate)\b/i;
const CREATIVE_KEYWORDS = /\b(brainstorm|ideate|concept|brand|tone|voice|copy|tagline|headline|slogan|pitch|story|narrative|campaign|persona|wireframe|mockup|prototype|layout|color|font|logo|visual|aesthetic)\b/i;
const MULTI_PART_MARKERS = /(\d+\.|[-•]\s|firstly|secondly|additionally|moreover|furthermore|on one hand|step \d|phase \d|part \d)/gi;

export function classifyMessageComplexity(message: string): MessageComplexity {
  const trimmed = message.trim();
  const wordCount = trimmed.split(/\s+/).length;

  // ── Simple: pure social signals that need no real thinking ──
  // Must be a greeting/ack AND not start with an action verb or question
  if (ACK_PATTERNS.test(trimmed)) {
    return 'simple';
  }

  if (wordCount <= 5 && GREETING_PATTERNS.test(trimmed)) {
    return 'simple';
  }

  // Short messages (≤3 words) are simple ONLY if they don't request work
  if (wordCount <= 3 && !ACTION_VERBS.test(trimmed) && !QUESTION_STARTERS.test(trimmed) && !TECHNICAL_KEYWORDS.test(trimmed)) {
    return 'simple';
  }

  // ── Complex: deep work that needs the best model ──
  const multiPartMatches = trimmed.match(MULTI_PART_MARKERS);
  if (multiPartMatches && multiPartMatches.length >= 2) {
    return 'complex';
  }

  if (wordCount > 60) {
    return 'complex';
  }

  // Tech + analysis together = always complex
  if (TECHNICAL_KEYWORDS.test(trimmed) && ANALYSIS_KEYWORDS.test(trimmed)) {
    return 'complex';
  }

  // Single analysis keyword with moderate length = complex
  if (wordCount > 15 && ANALYSIS_KEYWORDS.test(trimmed)) {
    return 'complex';
  }

  // Technical + creative = complex (e.g. "design the API for our brand dashboard")
  if (TECHNICAL_KEYWORDS.test(trimmed) && CREATIVE_KEYWORDS.test(trimmed)) {
    return 'complex';
  }

  // Long messages with any domain keyword = complex
  if (wordCount > 30 && (TECHNICAL_KEYWORDS.test(trimmed) || ANALYSIS_KEYWORDS.test(trimmed) || CREATIVE_KEYWORDS.test(trimmed))) {
    return 'complex';
  }

  return 'standard';
}

/**
 * Resolve adaptive maxTokens based on message complexity and context.
 */
export function resolveMaxTokens(
  complexity: MessageComplexity,
  isFirstMessage: boolean,
): number {
  if (isFirstMessage) return 500;

  switch (complexity) {
    case 'simple': return 300;
    case 'standard': return 800;
    case 'complex': return 1200;
  }
}
