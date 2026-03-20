import type { IStorage } from '../../storage.js';

export interface HandoffAnnouncementInput {
  completedAgent: { id: string; name: string; role: string };
  nextAgent: { id: string; name: string; role: string };
  completedTaskTitle: string;
  projectId: string;
  conversationId: string;
  storage: IStorage;
  broadcastToConversation: (convId: string, payload: unknown) => void;
  generateText: (prompt: string, system: string) => Promise<string>;
}

/**
 * Emits an in-character handoff announcement from the completing agent.
 * Called AFTER executeTask stores completed output so users see the output
 * before the announcement (per 07-RESEARCH.md anti-patterns).
 */
export async function emitHandoffAnnouncement(input: HandoffAnnouncementInput): Promise<void> {
  const prompt = `You are ${input.completedAgent.name}, a ${input.completedAgent.role}.
You just finished: "${input.completedTaskTitle}".
Write ONE short natural sentence (15-25 words) tagging @${input.nextAgent.name} to pick it up.
No bullet points. No headers. No markdown. Colleague voice. Like a real Slack message.`;

  const system = `You are ${input.completedAgent.name}.`;

  let announcement = await input.generateText(prompt, system);

  // Post-process: strip any markdown formatting as a safety net
  announcement = announcement
    .replace(/^#+\s/gm, '')   // remove ## headers
    .replace(/^\*+\s/gm, '')  // remove ** or * bullet lines
    .replace(/^-\s/gm, '')    // remove - bullet points
    .replace(/\*\*/g, '')     // remove bold markers
    .trim();

  const msg = await input.storage.createMessage({
    conversationId: input.conversationId,
    content: announcement,
    messageType: 'agent',
    agentId: input.completedAgent.id,
    userId: null,
    metadata: {
      isAutonomous: true,
      isHandoffAnnouncement: true,
      nextAgentId: input.nextAgent.id,
    } as any,
  });

  input.broadcastToConversation(input.conversationId, {
    type: 'new_message',
    conversationId: input.conversationId,
    message: msg,
  });
}
