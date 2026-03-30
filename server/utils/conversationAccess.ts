import { parseConversationId } from '../../shared/conversationId.js';

/**
 * Determines whether a given conversationId is accessible to a user.
 *
 * Two-step check:
 * 1. Primary: the conversation record exists under one of the user's projects.
 * 2. Fallback: no record exists yet (brand-new or pre-bootstrap project), but
 *    the conversationId encodes an owned projectId (project:{id}, team:{pid}:{tid},
 *    agent:{pid}:{aid}).  This allows join_conversation to succeed on the first
 *    visit before any messages have been sent.
 */
export async function checkConversationAccess(
  conversationId: string,
  ownedProjectIds: Set<string>,
  getConversationsByProject: (projectId: string) => Promise<Array<{ id: string }>>,
): Promise<boolean> {
  // Step 1: conversation record already exists under an owned project
  for (const projectId of ownedProjectIds) {
    const conversations = await getConversationsByProject(projectId);
    if (conversations.some((c) => c.id === conversationId)) {
      return true;
    }
  }

  // Step 2: no record yet — verify project ownership via the conversationId format
  try {
    const parsed = parseConversationId(conversationId);
    if (ownedProjectIds.has(parsed.projectId)) {
      return true;
    }
  } catch {
    // unparseable conversationId — deny
  }

  return false;
}
