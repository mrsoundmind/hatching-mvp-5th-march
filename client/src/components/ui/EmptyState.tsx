import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--hatchin-surface)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 hatchin-text-muted" />
      </div>
      <h3 className="text-sm font-semibold hatchin-text mb-1.5">{title}</h3>
      <p className="text-xs hatchin-text-muted max-w-[220px] leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--hatchin-blue)] text-white hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
