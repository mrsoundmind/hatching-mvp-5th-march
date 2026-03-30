/**
 * Deliverable Generator — produces structured documents via LLM.
 *
 * Takes a deliverable type + context and generates section-by-section content.
 * Streams progress via WebSocket events.
 */

import { storage } from '../storage.js';
import { getSectionsForType, getTypeLabel } from '@shared/deliverableTypes';
import { generateChatWithRuntimeFallback } from '../llm/providerResolver.js';
import type { Deliverable } from '@shared/schema';

interface GenerateDeliverableInput {
  projectId: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  type: string;
  title: string;
  description?: string;
  context?: string; // conversation context or upstream deliverable content
  parentDeliverableId?: string;
  packageId?: string;
  conversationId?: string;
  handoffNotes?: string;
}

interface GenerateResult {
  deliverable: Deliverable;
  generationTimeMs: number;
}

/**
 * Build the LLM prompt for deliverable generation.
 */
function buildGenerationPrompt(input: GenerateDeliverableInput, sections: string[]): string {
  const typeLabel = getTypeLabel(input.type);

  let prompt = `You are ${input.agentName}, a ${input.agentRole} on the user's project team.

Generate a professional ${typeLabel} titled "${input.title}".`;

  if (input.description) {
    prompt += `\n\nProject context: ${input.description}`;
  }

  if (input.context) {
    prompt += `\n\nAdditional context from the conversation or upstream deliverables:\n${input.context}`;
  }

  if (input.handoffNotes) {
    prompt += `\n\nHandoff notes from the previous agent: ${input.handoffNotes}`;
  }

  prompt += `\n\nStructure the document with these sections:\n${sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Requirements:
- Write in professional but accessible language
- Be specific and actionable, not generic
- Include concrete examples where appropriate
- Use markdown formatting (headers, lists, bold)
- Each section should have substantive content (not just placeholders)
- Total length: 800-2000 words
- Format each section with a ## heading

Output ONLY the document content in markdown. No meta-commentary.`;

  return prompt;
}

/**
 * Generate a deliverable using the LLM and store it.
 */
export async function generateDeliverable(input: GenerateDeliverableInput): Promise<GenerateResult> {
  const startTime = Date.now();
  const sections = getSectionsForType(input.type);
  const prompt = buildGenerationPrompt(input, sections);

  let content = '';
  try {
    const response = await generateChatWithRuntimeFallback({
      messages: [
        { role: 'system', content: `You are a professional ${input.agentRole} creating structured deliverables for a project team.` },
        { role: 'user', content: prompt },
      ],
      maxTokens: 4000,
      temperature: 0.7,
    });
    content = response.content || '';
  } catch (err) {
    // Fallback: generate a template
    content = sections.map(s => `## ${s}\n\n*Content generation in progress. This section will be populated by ${input.agentName}.*\n`).join('\n');
  }

  const generationTimeMs = Date.now() - startTime;

  // Create the deliverable in storage
  const deliverable = await storage.createDeliverable({
    projectId: input.projectId,
    agentId: input.agentId,
    agentName: input.agentName,
    agentRole: input.agentRole,
    type: input.type as any,
    title: input.title,
    description: input.description || null,
    content,
    conversationId: input.conversationId || null,
    parentDeliverableId: input.parentDeliverableId || null,
    packageId: input.packageId || null,
    handoffNotes: input.handoffNotes || null,
    metadata: {
      wordCount: content.split(/\s+/).length,
      sections,
      generationTimeMs,
    },
  });

  return { deliverable, generationTimeMs };
}

/**
 * Update a deliverable based on user iteration request.
 * Takes the existing content and a user instruction, produces updated content.
 */
export async function iterateDeliverable(
  deliverableId: string,
  instruction: string,
  agentName: string,
  agentRole: string,
): Promise<Deliverable | undefined> {
  const existing = await storage.getDeliverable(deliverableId);
  if (!existing) return undefined;

  let updatedContent = '';
  try {
    const response = await generateChatWithRuntimeFallback({
      messages: [
        {
          role: 'system',
          content: `You are ${agentName}, a ${agentRole}. You previously wrote a document and the user wants changes.`,
        },
        {
          role: 'user',
          content: `Here is the current document:\n\n${existing.content}\n\n---\n\nUser's request: ${instruction}\n\nApply the requested changes and output the FULL updated document in markdown. Keep the same section structure unless the user asked to change it.`,
        },
      ],
      maxTokens: 4000,
      temperature: 0.5,
    });
    updatedContent = response.content || existing.content;
  } catch {
    return existing;
  }

  // Create new version
  const versions = await storage.getDeliverableVersions(deliverableId);
  const nextVersion = versions.length + 1;
  await storage.createDeliverableVersion({
    deliverableId,
    versionNumber: nextVersion,
    content: updatedContent,
    changeDescription: instruction.slice(0, 200),
    createdByAgentId: existing.agentId,
  });

  // Update deliverable
  const updated = await storage.updateDeliverable(deliverableId, {
    content: updatedContent,
    currentVersion: nextVersion,
    metadata: {
      ...existing.metadata,
      wordCount: updatedContent.split(/\s+/).length,
    },
  });

  return updated;
}
