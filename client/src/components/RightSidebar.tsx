import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRightSidebarState } from "@/hooks/useRightSidebarState";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import { useAutonomyFeed } from "@/hooks/useAutonomyFeed";
import { useQuery } from "@tanstack/react-query";
import { SidebarTabBar } from "./sidebar/SidebarTabBar";
import { ActivityTab } from "./sidebar/ActivityTab";
import { ApprovalsTab } from "./sidebar/ApprovalsTab";
import { BrainDocsTab } from "./sidebar/BrainDocsTab";
import { isApprovalExpired } from "./sidebar/approvalUtils";
import TaskManager from "./TaskManager";
import type { Project, Team, Agent, Task } from "@shared/schema";
import { getAgentColors } from "@/lib/agentColors";
import { getRoleDefinition } from "@shared/roleRegistry";
import AgentAvatar from "@/components/avatars/AgentAvatar";

interface RightSidebarProps {
  activeProject: Project | undefined;
  activeTeam?: Team;
  activeAgent?: Agent;
}

export function RightSidebar({ activeProject, activeTeam, activeAgent }: RightSidebarProps) {
  const { toast } = useToast();
  const { state, actions } = useRightSidebarState(activeProject, activeTeam, activeAgent);
  const { unreadCount, clearUnread } = useAutonomyFeed(activeProject?.id);

  // Fetch project agents for ActivityTab filter dropdown
  const { data: projectAgents } = useQuery<Agent[]>({
    queryKey: ['/api/projects', activeProject?.id, 'agents'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${activeProject!.id}/agents`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeProject?.id,
    staleTime: 60_000,
  });

  // Fetch all project tasks for hasPendingApprovals badge wiring.
  // MUST match ApprovalsTab queryKey exactly for TanStack deduplication.
  const { data: allTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks', `?projectId=${activeProject?.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?projectId=${activeProject!.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeProject?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const hasPendingApprovals = React.useMemo(
    () =>
      (allTasks ?? []).some(t => {
        const meta = t.metadata as Record<string, unknown>;
        return (
          meta?.awaitingApproval === true &&
          !meta?.approvedAt &&
          !meta?.rejectedAt &&
          !isApprovalExpired(t)
        );
      }),
    [allTasks]
  );

  const { activeTab } = state;
  const { setActiveTab } = actions;

  const handleTabChange = (tab: 'activity' | 'brain' | 'approvals') => {
    setActiveTab(tab);
    if (tab === 'activity') clearUnread();
  };

  // Local state for view switching
  const [currentView, setCurrentView] = React.useState<'overview' | 'tasks'>('overview');
  const [isPanelScrolling, setIsPanelScrolling] = React.useState(false);
  const panelScrollHideTimeoutRef = React.useRef<number | null>(null);

  // Task notification badge
  const [hasNewTasks, setHasNewTasks] = React.useState(false);

  // Clear badge when switching projects
  React.useEffect(() => {
    setHasNewTasks(false);
  }, [activeProject?.id]);

  React.useEffect(() => {
    const handler = () => {
      if (currentView !== 'tasks') setHasNewTasks(true);
    };
    window.addEventListener('tasks_updated', handler);
    window.addEventListener('task_created_from_chat', handler);
    return () => {
      window.removeEventListener('tasks_updated', handler);
      window.removeEventListener('task_created_from_chat', handler);
    };
  }, [currentView]);

  // Progressive disclosure coachmark
  const [showCoachmark, setShowCoachmark] = React.useState(false);

  // Cross-component state: Track if AI is actively streaming a response
  const [isAIStreaming, setIsAIStreaming] = React.useState(false);

  React.useEffect(() => {
    // Listen for AI streaming state changes broadcasted from CenterPanel
    const handleStreamingActive = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      setIsAIStreaming(customEvent.detail.active);
    };

    window.addEventListener('ai_streaming_active', handleStreamingActive);
    return () => {
      window.removeEventListener('ai_streaming_active', handleStreamingActive);
    };
  }, []);

  React.useEffect(() => {
    // Only show on project view, if not dismissed yet
    if (state.activeView === 'project' && !localStorage.getItem('hatchin_sidebar_coach_done')) {
      setShowCoachmark(true);
    }
  }, [state.activeView]);

  const handleCoachmarkDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowCoachmark(false);
    localStorage.setItem('hatchin_sidebar_coach_done', 'true');
    if (!state.expandedSections.executionRules) {
      actions.toggleSection('executionRules');
    }
  };

  // Real-time updates for sidebar data
  const [realTimeProgress, setRealTimeProgress] = React.useState(0);
  const [realTimeTimeline, setRealTimeTimeline] = React.useState<Array<any>>([]);
  const [realTimeMetrics, setRealTimeMetrics] = React.useState({
    messagesCount: 0,
    lastActivity: new Date(),
    activeParticipants: [] as string[],
    taskCompletions: 0,
    milestoneReaches: 0,
  });

  // Set up real-time updates
  const { isConnected } = useRealTimeUpdates({
    activeProject,
    activeTeam,
    activeAgent,
    onMetricsUpdate: (metrics) => {
      setRealTimeMetrics(metrics);
      console.log('📊 Right sidebar metrics updated:', metrics);
    },
    onProgressUpdate: (progressDelta) => {
      setRealTimeProgress(prev => Math.min(100, prev + progressDelta));
      console.log('📈 Progress updated by:', progressDelta);
    },
    onTimelineUpdate: (event) => {
      setRealTimeTimeline(prev => [event, ...prev].slice(0, 10)); // Keep last 10 events
      console.log('📅 Timeline updated:', event);
    },
    onTaskSuggestion: (suggestions) => {
      console.log('🤖 AI Task suggestions received:', suggestions);
      // This will be handled by the TaskManager component
    },
    debounceMs: 500
  });

  const schedulePanelScrollbarHide = React.useCallback(() => {
    if (panelScrollHideTimeoutRef.current) {
      window.clearTimeout(panelScrollHideTimeoutRef.current);
    }
    panelScrollHideTimeoutRef.current = window.setTimeout(() => {
      setIsPanelScrolling(false);
    }, 500);
  }, []);

  const showPanelScrollbarTemporarily = React.useCallback(() => {
    setIsPanelScrolling(true);
    schedulePanelScrollbarHide();
  }, [schedulePanelScrollbarHide]);

  React.useEffect(() => {
    return () => {
      if (panelScrollHideTimeoutRef.current) {
        window.clearTimeout(panelScrollHideTimeoutRef.current);
      }
    };
  }, []);

  const {
    coreDirection,
    executionRules,
    teamCulture,
    expandedSections,
    recentlySaved,
    activeView,
    isLoading,
    error,
  } = state;

  // Destructure actions from hook
  const {
    updateCoreDirection,
    updateExecutionRules,
    updateTeamCulture,
    toggleSection,
    setRecentlySaved,
  } = actions;
  const panelCardClass = "premium-card p-4";
  const asideClassName = `w-80 h-[calc(100vh-20px)] min-h-0 premium-column-bg rounded-2xl p-6 overflow-y-auto hide-scrollbar my-2.5 relative right-sidebar-scroll ${isPanelScrolling ? 'is-scrolling' : ''}`;
  const computedProgress = Math.min(100, Math.max(0, (activeProject?.progress || 0) + realTimeProgress));
  const agentHealthScore = Math.min(99, Math.max(45, 62 + realTimeMetrics.taskCompletions * 3 + Math.min(25, realTimeMetrics.messagesCount) * 0.3));
  const roleSummary = activeAgent?.role || activeTeam?.name || activeProject?.name || 'Project';
  const timelineEvents = realTimeTimeline.length > 0
    ? realTimeTimeline
    : [{
      title: 'Waiting for new activity',
      date: new Date().toISOString(),
      status: 'Idle',
      color: '#A6A7AB'
    }];

  // FIX 13 — Brain-Sync visual progress indicator during saves
  const brainsyncBanner = (
    <>
      {isLoading && (
        <div className="mb-3 rounded-xl overflow-hidden border border-hatchin-blue/20">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-hatchin-blue animate-pulse flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Syncing to Project Brain...</span>
          </div>
          <div className="h-1 w-full brain-sync-bar" />
        </div>
      )}
      {!isLoading && recentlySaved.size > 0 && (
        <div
          className="mb-3 rounded-xl border border-[#47DB9A]/20 px-3 py-2 flex items-center gap-2"
          style={{ backgroundColor: 'rgba(71,219,154,0.07)' }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#47DB9A] flex-shrink-0" />
          <span className="text-xs text-[#47DB9A] font-medium">Brain Synced ✓</span>
        </div>
      )}
    </>
  );

  if (activeView === 'none') {
    return (
      <aside className="w-80 premium-column-bg rounded-2xl p-6 flex flex-col items-center justify-center my-2.5 relative overflow-hidden">
        <div className="ambient-glow-top" />
        <div className="text-center hatchin-text-muted">
          <div className="text-4xl mb-4">🧠</div>
          <p className="text-sm">
            Select a project to view its overview
          </p>
        </div>
      </aside>
    );
  }

  // Real save functionality that persists data
  const handleSave = async (section: string, data: any) => {
    try {
      actions.setLoading(true);

      // Determine what data to save based on section
      let saveData: any = {};
      let saveEndpoint: string | null = null;
      if (activeView === 'team' && activeTeam?.id) {
        saveEndpoint = `/api/teams/${activeTeam.id}`;
      } else if (activeView === 'agent' && activeAgent?.id) {
        saveEndpoint = `/api/agents/${activeAgent.id}`;
      } else if (activeProject?.id) {
        saveEndpoint = `/api/projects/${activeProject.id}`;
      }

      if (!saveEndpoint) {
        throw new Error('No active entity to save to');
      }

      switch (section) {
        case 'core-direction':
          saveData = {
            coreDirection: {
              whatBuilding: coreDirection.whatBuilding,
              whyMatters: coreDirection.whyMatters,
              whoFor: coreDirection.whoFor,
            }
          };
          break;
        case 'execution-rules':
          saveData = { executionRules: executionRules };
          break;
        case 'team-culture':
          saveData = { teamCulture: teamCulture };
          break;
        default:
          saveData = data;
      }

      // Make API call to save data
      const response = await fetch(saveEndpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.statusText}`);
      }

      // Mark as recently saved for UI feedback
      setRecentlySaved(section);

      // Get the correct sidebar name based on active view
      const getSidebarName = () => {
        if (activeView === 'agent') return 'Agent Profile';
        if (activeView === 'team') return 'Team Dashboard';
        if (activeView === 'project') return 'Project Overview';
        return 'sidebar';
      };

      // Show success toast
      toast({
        title: "Saved successfully",
        description: `${section.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} has been saved to ${getSidebarName()}.`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Save error:', error);
      actions.setError(error instanceof Error ? error.message : 'Save failed');

      toast({
        title: "Save failed",
        description: "Unable to save changes. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      actions.setLoading(false);
    }
  };

  // Render the tabbed sidebar for all active views (agent, team, project)
  return (
    <aside
      className={asideClassName}
      onScroll={showPanelScrollbarTemporarily}
      onWheel={showPanelScrollbarTemporarily}
      onTouchMove={showPanelScrollbarTemporarily}
    >
      <div className="ambient-glow-top" />

      {/* Top-level 3-tab bar */}
      <SidebarTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadActivityCount={unreadCount}
        hasPendingApprovals={hasPendingApprovals}
      />

      {/* Activity tab panel (CSS-hidden, never unmounted) */}
      <div
        style={{ display: activeTab === 'activity' ? 'flex' : 'none' }}
        aria-hidden={activeTab !== 'activity'}
        className="flex-1 flex flex-col overflow-y-auto hide-scrollbar"
      >
        <ActivityTab
          projectId={activeProject?.id}
          agents={projectAgents?.map(a => ({ id: a.id, name: a.name, role: a.role })) || []}
        />
      </div>

      {/* Approvals tab panel (CSS-hidden, never unmounted) */}
      <div
        style={{ display: activeTab === 'approvals' ? 'flex' : 'none' }}
        aria-hidden={activeTab !== 'approvals'}
        className="flex-1 flex flex-col overflow-y-auto hide-scrollbar"
      >
        <ApprovalsTab projectId={activeProject?.id} />
      </div>

      {/* Brain & Docs tab panel (CSS-hidden, never unmounted) */}
      <div
        style={{ display: activeTab === 'brain' ? 'flex' : 'none' }}
        aria-hidden={activeTab !== 'brain'}
        className="flex-1 flex flex-col overflow-y-auto hide-scrollbar"
      >
        <BrainDocsTab projectId={activeProject?.id} project={activeProject} />
      </div>

    </aside>
  );
}
