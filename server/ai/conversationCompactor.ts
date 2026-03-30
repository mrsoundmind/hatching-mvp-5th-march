/**
 * Conversation Compactor — Phase 6: Billing + LLM Intelligence
 *
 * Summarizes older messages to reduce context size sent to the LLM.
 * Feature-flagged via FEATURE_CONVERSATION_COMPACTION (default: false).
 * Uses Groq (free tier) for summarization, falls back to default provider.
 */

import { generateWithPreferredProvider } from '../llm/providerResolver.js';
import type { IStorage } from '../storage.js';
import { db } from '../db.js';
import { conversationMemory } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/** In-flight compaction guard — prevents concurrent compaction of the same conversation */
const compactingSet = new Set<string>();

const COMPACTION_THRESHOLD = 8;
const TAIL_SIZE = 4;
const FALLBACK_TAIL_SIZE = 10;

// ── Public API ──────────────────────────────────────────────────────────────

export function isCompactionEnabled(): boolean {
  return process.env.FEATURE_CONVERSATION_COMPACTION === 'true';
}

export function shouldCompact(messageCount: number): boolean {
  return messageCount >= COMPACTION_THRESHOLD;
}

/**
 * Fire-and-forget: summarize older messages and store the summary.
 * Safe to call without awaiting — errors are logged and swallowed.
 */
export async function compactConversation(
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  storage: IStorage,
): Promise<void> {
  if (!isCompactionEnabled()) return;
  if (!shouldCompact(messages.length)) return;
  if (compactingSet.has(conversationId)) return;

  compactingSet.add(conversationId);
  try {
    await runCompaction(conversationId, messages, storage);
  } catch (err) {
    console.error(`[compactor] compaction failed for ${conversationId}:`, err);
  } finally {
    compactingSet.delete(conversationId);
  }
}

/**
 * Returns compacted context if a summary exists, otherwise falls back to
 * returning the last 10 messages (current default behavior).
 */
type HistoryEntry = { role: 'user' | 'assistant'; content: string; timestamp: string; senderId?: string; messageType?: 'user' | 'agent' };

export async function getCompactedContext(
  conversationId: string,
  allMessages: HistoryEntry[],
  storage: IStorage,
): Promise<{ history: HistoryEntry[]; wasCompacted: boolean }> {
  if (!isCompactionEnabled()) {
    return {
      history: allMessages.slice(-FALLBACK_TAIL_SIZE),
      wasCompacted: false,
    };
  }

  const memories = await storage.getConversationMemory(conversationId);
  const summary = memories.find(
    (m: { memoryType: string }) => m.memoryType === 'compaction_summary',
  );

  if (!summary) {
    return {
      history: allMessages.slice(-FALLBACK_TAIL_SIZE),
      wasCompacted: false,
    };
  }

  // Inject summary as an 'assistant' message so it fits the ChatContext type
  const summaryMessage: HistoryEntry = {
    role: 'assistant',
    content: `[Conversation summary] ${summary.content}`,
    timestamp: summary.createdAt?.toISOString?.() ?? new Date().toISOString(),
    senderId: 'system',
    messageType: 'agent',
  };

  const recentMessages = allMessages.slice(-TAIL_SIZE);

  return {
    history: [summaryMessage, ...recentMessages],
    wasCompacted: true,
  };
}

// ── Internal ────────────────────────────────────────────────────────────────

async function runCompaction(
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  storage: IStorage,
): Promise<void> {
  const toSummarize = messages.slice(0, messages.length - TAIL_SIZE);
  if (toSummarize.length === 0) return;

  const transcript = toSummarize
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const result = await generateWithPreferredProvider(
    {
      messages: [
        {
          role: 'system',
          content:
            'You are a concise conversation summarizer. Summarize the following conversation in 3-4 sentences, preserving key decisions, action items, and context that would be needed to continue the conversation.',
        },
        {
          role: 'user',
          content: `Summarize this conversation:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 300,
    },
    'groq',
  );

  const summaryText = result.content?.trim();
  if (!summaryText) {
    console.warn(`[compactor] empty summary returned for ${conversationId}`);
    return;
  }

  // Delete existing compaction_summary rows for this conversation
  await db
    .delete(conversationMemory)
    .where(
      and(
        eq(conversationMemory.conversationId, conversationId),
        eq(conversationMemory.memoryType, 'compaction_summary'),
      ),
    );

  // Insert fresh summary
  await storage.createConversationMemory({
    conversationId,
    memoryType: 'compaction_summary',
    content: summaryText,
    importance: 8,
  });
}
