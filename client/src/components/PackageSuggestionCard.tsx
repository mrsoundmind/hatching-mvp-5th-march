import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles, X, ChevronRight, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface PackageSuggestionCardProps {
  projectId: string;
  projectName: string;
  suggestedTemplate: 'launch' | 'content-sprint' | 'research';
  onDismiss: () => void;
  onStarted: () => void;
}

const TEMPLATE_INFO: Record<string, { title: string; description: string; deliverables: string[]; icon: string }> = {
  'launch': {
    title: 'Launch Package',
    description: 'Your team will produce a coordinated set of launch documents',
    deliverables: ['Product Requirements', 'Technical Spec', 'Design Brief', 'Go-to-Market Plan', 'Project Timeline'],
    icon: '🚀',
  },
  'content-sprint': {
    title: 'Content Sprint',
    description: 'A full content push produced by your marketing team',
    deliverables: ['Blog Post', 'Social Content Calendar', 'Email Sequence', 'SEO Brief'],
    icon: '✍️',
  },
  'research': {
    title: 'Research Package',
    description: 'Deep analysis to understand your market and competition',
    deliverables: ['Competitive Analysis', 'Market Research', 'Data Insights Report'],
    icon: '🔍',
  },
};

export function PackageSuggestionCard({ projectId, projectName, suggestedTemplate, onDismiss, onStarted }: PackageSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const info = TEMPLATE_INFO[suggestedTemplate];

  const createPackageMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: `${info.title} — ${projectName}`,
          template: suggestedTemplate,
          description: info.description,
        }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create package');
      return res.json();
    },
    onSuccess: () => {
      onStarted();
    },
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="premium-card mx-4 mb-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--hatchin-blue)] to-[#8B9AFF] flex items-center justify-center text-lg shrink-0">
            {info.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--hatchin-blue)]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--hatchin-blue)]">
                Suggested for you
              </span>
            </div>
            <h4 className="text-sm font-semibold hatchin-text mt-0.5">
              {info.title}
            </h4>
            <p className="text-xs hatchin-text-muted mt-0.5">
              {info.description}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-[var(--hatchin-surface)] transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 hatchin-text-muted" />
          </button>
        </div>

        {/* Deliverable preview */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-1.5 flex items-center gap-1.5 text-[11px] hatchin-text-muted hover:text-[var(--hatchin-blue)] transition-colors"
        >
          <Package className="w-3 h-3" />
          <span>{info.deliverables.length} deliverables</span>
          <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-2 space-y-1">
                {info.deliverables.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] hatchin-text-muted">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--hatchin-blue)]" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action */}
        <div className="px-4 pb-4 pt-2 flex gap-2">
          <button
            onClick={() => createPackageMutation.mutate()}
            disabled={createPackageMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold
              bg-[var(--hatchin-blue)] text-white hover:opacity-90 disabled:opacity-50 transition-all min-h-[44px]"
          >
            {createPackageMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate {info.title}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Determine the best chain template for a set of agent roles.
 */
export function suggestPackageTemplate(memberRoles: string[]): 'launch' | 'content-sprint' | 'research' | null {
  const roles = new Set(memberRoles.map(r => r.toLowerCase()));

  // Score each template by how many required roles are present
  const scores: Record<string, number> = {
    'launch': 0,
    'content-sprint': 0,
    'research': 0,
  };

  // Launch: PM, Engineer/Tech Lead, Designer, Marketer
  const launchRoles = ['product manager', 'backend developer', 'software engineer', 'technical lead', 'product designer', 'ux designer', 'growth marketer', 'marketing specialist'];
  for (const r of launchRoles) {
    if (roles.has(r)) scores['launch']++;
  }

  // Content: Content Writer, Copywriter, Social Media, Email, SEO
  const contentRoles = ['content writer', 'copywriter', 'social media manager', 'email specialist', 'seo specialist', 'brand strategist'];
  for (const r of contentRoles) {
    if (roles.has(r)) scores['content-sprint']++;
  }

  // Research: Business Analyst, Data Analyst, Data Scientist, Operations
  const researchRoles = ['business analyst', 'data analyst', 'data scientist', 'business strategist', 'operations manager'];
  for (const r of researchRoles) {
    if (roles.has(r)) scores['research']++;
  }

  // Need at least 2 matching roles to suggest
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best[1] >= 2) return best[0] as 'launch' | 'content-sprint' | 'research';

  // Default to launch if PM is present (most common)
  if (roles.has('product manager')) return 'launch';

  return null;
}
