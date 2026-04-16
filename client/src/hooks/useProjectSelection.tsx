import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { devLog } from '@/lib/devLog';

interface ProjectSelectionContextValue {
  activeProjectId: string | null;
  activeTeamId: string | null;
  activeAgentId: string | null;
  setActiveProjectId: (id: string | null) => void;
  setActiveTeamId: (id: string | null) => void;
  setActiveAgentId: (id: string | null) => void;
}

const ProjectSelectionContext = createContext<ProjectSelectionContextValue | null>(null);

function readStoredProjectId(): string | null {
  try {
    const stored = localStorage.getItem('hatchin_active_project');
    if (stored && stored !== 'null' && stored !== 'undefined') return stored;
  } catch { /* ignore */ }
  return null;
}

export function ProjectSelectionProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectIdRaw] = useState<string | null>(readStoredProjectId);
  const [activeTeamId, setActiveTeamIdRaw] = useState<string | null>(null);
  const [activeAgentId, setActiveAgentIdRaw] = useState<string | null>(null);

  // Persist activeProjectId to localStorage
  useEffect(() => {
    try {
      if (activeProjectId) {
        localStorage.setItem('hatchin_active_project', activeProjectId);
      } else {
        localStorage.removeItem('hatchin_active_project');
      }
    } catch { /* ignore */ }
  }, [activeProjectId]);

  const setActiveProjectId = useCallback((id: string | null) => {
    devLog('PROJECT_SELECTION_CONTEXT', { action: 'setActiveProjectId', id });
    setActiveProjectIdRaw(id);
  }, []);

  const setActiveTeamId = useCallback((id: string | null) => {
    devLog('PROJECT_SELECTION_CONTEXT', { action: 'setActiveTeamId', id });
    setActiveTeamIdRaw(id);
  }, []);

  const setActiveAgentId = useCallback((id: string | null) => {
    devLog('PROJECT_SELECTION_CONTEXT', { action: 'setActiveAgentId', id });
    setActiveAgentIdRaw(id);
  }, []);

  return (
    <ProjectSelectionContext.Provider
      value={{
        activeProjectId,
        activeTeamId,
        activeAgentId,
        setActiveProjectId,
        setActiveTeamId,
        setActiveAgentId,
      }}
    >
      {children}
    </ProjectSelectionContext.Provider>
  );
}

export function useProjectSelection(): ProjectSelectionContextValue {
  const ctx = useContext(ProjectSelectionContext);
  if (!ctx) {
    throw new Error('useProjectSelection must be used within a ProjectSelectionProvider');
  }
  return ctx;
}
