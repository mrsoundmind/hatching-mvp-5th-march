import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';

interface FeedFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  agentFilter: string | null;
  onAgentFilterChange: (agentId: string | null) => void;
  agents: Array<{ id: string; name: string; role: string }>;
}

const FILTER_PILLS = [
  { id: 'all',      label: 'All',       color: 'var(--hatchin-text-muted)' },
  { id: 'task',     label: 'Tasks',     color: 'var(--hatchin-green)' },
  { id: 'handoff',  label: 'Handoffs',  color: 'var(--hatchin-blue)' },
  { id: 'review',   label: 'Reviews',   color: 'var(--hatchin-orange)' },
  { id: 'approval', label: 'Approvals', color: '#f59e0b' },
];

export function FeedFilters({
  activeFilter,
  onFilterChange,
  agentFilter,
  onAgentFilterChange,
  agents,
}: FeedFiltersProps) {
  return (
    <div className="mb-3">
      {/* Inline text pills — no icons, underline shows active */}
      <div className="flex items-center gap-1 flex-wrap px-1">
        {FILTER_PILLS.map((pill) => {
          const isActive = activeFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => onFilterChange(pill.id)}
              className="relative text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors min-h-[44px] lg:min-h-auto"
              style={{
                color: isActive ? pill.color : 'var(--hatchin-text-muted)',
              }}
            >
              {pill.label}
              {isActive && (
                <motion.div
                  layoutId="feed-filter-underline"
                  className="absolute bottom-0.5 left-2 right-2 h-[2px] rounded-full"
                  style={{ backgroundColor: pill.color }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Agent filter — only show when there are multiple agents */}
      {agents.length > 1 && (
        <div className="mt-2 px-1">
          <Select value={agentFilter ?? '__all__'} onValueChange={(v) => onAgentFilterChange(v === '__all__' ? null : v)}>
            <SelectTrigger className="h-8 text-[11px] rounded-full border-[var(--hatchin-border-subtle)] bg-transparent">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">All agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="text-xs">
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
