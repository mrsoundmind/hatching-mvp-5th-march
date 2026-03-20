import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export interface AutonomousApprovalCardProps {
  taskId: string;
  agentName: string;
  riskReasons: string[];
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  isLoading: boolean;
}

export function AutonomousApprovalCard({
  taskId,
  agentName,
  riskReasons,
  onApprove,
  onReject,
  isLoading,
}: AutonomousApprovalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mx-4 my-2 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-hatchin-text-bright">
            {agentName} needs your approval
          </p>
          {riskReasons.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {riskReasons.join(' . ')}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onApprove(taskId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-hatchin-blue text-white hover:bg-hatchin-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => onReject(taskId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
