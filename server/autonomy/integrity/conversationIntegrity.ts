import { randomUUID } from 'crypto';

interface ConversationState {
  lastTimestampMs: number;
  lastAccessedMs: number;
  seenMessageIds: Set<string>;
  seenIdempotencyKeys: Set<string>;
}

const stateByConversation = new Map<string, ConversationState>();

// TTL pruning: remove entries older than 2 hours, run every 30 minutes
const PRUNE_INTERVAL_MS = 30 * 60 * 1000;
const STATE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CONVERSATIONS = 10_000;

function pruneStaleState(): void {
  const now = Date.now();
  for (const [key, state] of stateByConversation) {
    if (now - state.lastAccessedMs > STATE_TTL_MS) {
      stateByConversation.delete(key);
    }
  }
  // Hard cap: if still over limit, remove oldest entries
  if (stateByConversation.size > MAX_CONVERSATIONS) {
    const sorted = [...stateByConversation.entries()].sort((a, b) => a[1].lastAccessedMs - b[1].lastAccessedMs);
    const toRemove = sorted.slice(0, stateByConversation.size - MAX_CONVERSATIONS);
    for (const [key] of toRemove) {
      stateByConversation.delete(key);
    }
  }
}

const _pruneTimer = setInterval(pruneStaleState, PRUNE_INTERVAL_MS);
if (_pruneTimer.unref) _pruneTimer.unref(); // Don't keep process alive for cleanup

function getState(conversationId: string): ConversationState {
  const existing = stateByConversation.get(conversationId);
  if (existing) {
    existing.lastAccessedMs = Date.now();
    return existing;
  }
  const created: ConversationState = {
    lastTimestampMs: 0,
    lastAccessedMs: Date.now(),
    seenMessageIds: new Set(),
    seenIdempotencyKeys: new Set(),
  };
  stateByConversation.set(conversationId, created);
  return created;
}

export function ensureMessageId(messageId?: string): string {
  const candidate = (messageId || '').trim();
  return candidate.length > 0 ? candidate : `msg-${randomUUID()}`;
}

const MAX_SEEN_IDS_PER_CONVERSATION = 2000;

export function assertUniqueMessageId(conversationId: string, messageId: string): { unique: boolean; reason?: string } {
  const state = getState(conversationId);
  if (state.seenMessageIds.has(messageId)) {
    return { unique: false, reason: 'duplicate_message_id' };
  }
  state.seenMessageIds.add(messageId);
  // Cap per-conversation Set to prevent unbounded growth
  if (state.seenMessageIds.size > MAX_SEEN_IDS_PER_CONVERSATION) {
    const iter = state.seenMessageIds.values();
    state.seenMessageIds.delete(iter.next().value!);
  }
  return { unique: true };
}

export function checkIdempotencyKey(conversationId: string, idempotencyKey?: string): {
  shouldProcess: boolean;
  reason?: string;
} {
  const key = (idempotencyKey || '').trim();
  if (!key) return { shouldProcess: true };

  const state = getState(conversationId);
  if (state.seenIdempotencyKeys.has(key)) {
    return { shouldProcess: false, reason: 'duplicate_idempotency_key' };
  }

  state.seenIdempotencyKeys.add(key);
  return { shouldProcess: true };
}

export function assertConversationOrdering(conversationId: string, messageTimestamp?: string): {
  inOrder: boolean;
  reason?: string;
} {
  if (!messageTimestamp) {
    return { inOrder: true };
  }

  const current = new Date(messageTimestamp).getTime();
  if (!Number.isFinite(current)) {
    return { inOrder: false, reason: 'invalid_timestamp' };
  }

  const state = getState(conversationId);
  if (current + 1_000 < state.lastTimestampMs) {
    return { inOrder: false, reason: 'out_of_order_timestamp' };
  }

  state.lastTimestampMs = Math.max(state.lastTimestampMs, current);
  return { inOrder: true };
}

export function resetConversationIntegrity(conversationId?: string): void {
  if (conversationId) {
    stateByConversation.delete(conversationId);
    return;
  }
  stateByConversation.clear();
}

export function getConversationIntegritySnapshot(conversationId: string): {
  seenMessageIds: number;
  seenIdempotencyKeys: number;
  lastTimestampMs: number;
} {
  const state = getState(conversationId);
  return {
    seenMessageIds: state.seenMessageIds.size,
    seenIdempotencyKeys: state.seenIdempotencyKeys.size,
    lastTimestampMs: state.lastTimestampMs,
  };
}
