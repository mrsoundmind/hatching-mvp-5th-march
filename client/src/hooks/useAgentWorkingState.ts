/**
 * Tracks which agents are currently executing background tasks.
 *
 * Returns a Set<string> of agent IDs that are currently working.
 * Used by LeftSidebar/ProjectTree for avatar "working" animations,
 * and also re-exported through useAutonomyFeed per CONTEXT.md interface.
 */

import { useState } from 'react';
import { useSidebarEvent } from './useSidebarEvent';
import { AUTONOMY_EVENTS, type AgentWorkingStatePayload } from '@/lib/autonomyEvents';

export function useAgentWorkingState(): Set<string> {
  const [workingAgents, setWorkingAgents] = useState<Set<string>>(new Set());

  useSidebarEvent<AgentWorkingStatePayload>(
    AUTONOMY_EVENTS.AGENT_WORKING_STATE,
    (detail) => {
      setWorkingAgents(prev => {
        const next = new Set(prev);
        if (detail.isWorking) {
          next.add(detail.agentId);
        } else {
          next.delete(detail.agentId);
        }
        return next;
      });
    },
    []
  );

  return workingAgents;
}
