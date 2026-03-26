import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { isApprovalExpired } from './approvalUtils';
import type { Task } from '@shared/schema';

interface ApprovalItemProps {
  task: Task;
}

export function ApprovalItem({ task }: ApprovalItemProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Cast to Record<string, unknown> — metadata at runtime contains fields
  // (awaitingApproval, riskScore, riskReasons, approvedAt, rejectedAt) that
  // are not in the typed schema (they are written by taskExecutionPipeline.ts).
  const meta = task.metadata as Record<string, unknown>;
  const isExpired = isApprovalExpired(task);

  const approveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/tasks/${task.id}/approve`, { method: 'POST' }).then(r => {
        if (!r.ok) throw new Error('Failed to approve');
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        description: "Couldn't process your decision. Try again.",
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/tasks/${task.id}/reject`, { method: 'POST' }).then(r => {
        if (!r.ok) throw new Error('Failed to reject');
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        description: "Couldn't process your decision. Try again.",
        variant: 'destructive',
      });
    },
  });

  const isLoading = approveMutation.isPending || rejectMutation.isPending;
  const agentName = task.assignee ?? 'Hatch';
  const riskScore = meta?.riskScore as number | undefined;
  const borderColor =
    riskScore && riskScore >= 0.6
      ? 'border-l-[var(--hatchin-orange)]'
      : 'border-l-amber-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: isExpired ? 0 : 0.18, ease: 'easeOut' }}
      className={`flex items-start gap-2.5 px-3 py-3 rounded-lg bg-[var(--hatchin-surface)] border-l-[3px] ${borderColor}`}
    >
      {/* Agent avatar — 32px circle with initial letter */}
      <div className="w-8 h-8 rounded-full bg-[var(--hatchin-surface-hover)] flex items-center justify-center text-xs font-semibold shrink-0">
        {agentName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {/* Agent name */}
        <p className="text-sm font-semibold text-[var(--hatchin-text-bright)]">
          {agentName}
        </p>

        {/* Risk reasons */}
        {Array.isArray(meta?.riskReasons) &&
          (meta.riskReasons as string[]).length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {(meta.riskReasons as string[]).join(' · ')}
            </p>
          )}

        {/* Expired badge OR approve/reject buttons */}
        <div className="flex gap-2 mt-2">
          {isExpired ? (
            <span
              className="inline-flex px-2 py-0.5 text-xs rounded-md bg-red-500/10 text-red-400"
              aria-label="Approval expired"
            >
              Expired
            </span>
          ) : (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => approveMutation.mutate()}
                aria-label={`Approve task: ${task.title}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--hatchin-blue)] text-white hover:bg-[var(--hatchin-blue)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve Task
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => rejectMutation.mutate()}
                aria-label={`Reject task: ${task.title}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject Task
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
