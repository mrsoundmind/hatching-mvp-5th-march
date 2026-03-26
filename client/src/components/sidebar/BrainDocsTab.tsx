import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { DocumentUploadZone } from './DocumentUploadZone';
import { DocumentCard } from './DocumentCard';
import { AutonomySettingsPanel } from './AutonomySettingsPanel';
import { WorkOutputSection } from './WorkOutputSection';
import type { Project } from '@shared/schema';

interface BrainDocsTabProps {
  projectId: string | undefined;
  project: Project | undefined;
}

export function BrainDocsTab({ projectId, project }: BrainDocsTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Local optimistic removal state
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const uploadZoneRef = useRef<HTMLButtonElement>(null);

  if (!projectId) {
    return null;
  }

  const documents = project?.brain?.documents ?? [];
  const executionRules = project?.executionRules;

  // Filter out optimistically removed docs
  const visibleDocs = documents.filter(doc => !removingIds.has(doc.id));

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    toast({ description: "Document added to your team's brain" });
  };

  const handleDelete = async (docId: string) => {
    // Optimistic removal
    setRemovingIds(prev => new Set(prev).add(docId));

    try {
      const res = await fetch(`/api/projects/${projectId}/brain/documents/${docId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('delete failed');
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ description: 'Document removed' });
    } catch {
      // Restore on error
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      toast({
        description: "Couldn't remove document. Try again.",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="px-4 py-4 flex flex-col gap-0">
      {/* Upload zone */}
      <DocumentUploadZone
        projectId={projectId}
        onUploadComplete={handleUploadComplete}
      />

      {/* Document list or empty state */}
      <div className="mt-3">
        {visibleDocs.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Your team's knowledge base"
            description="Upload documents your Hatches can reference when working — briefs, specs, research, anything that gives them context."
            action={{
              label: 'Upload your first document',
              onClick: () => {
                // Trigger the hidden file input in DocumentUploadZone
                // The upload zone's root div handles click internally
                const zone = document.querySelector<HTMLElement>('[aria-label="Upload document — drag and drop or click to browse"]');
                zone?.click();
              },
            }}
          />
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {visibleDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="my-6" />

      {/* Autonomy settings */}
      <AutonomySettingsPanel
        projectId={projectId}
        executionRules={executionRules as Record<string, unknown> | null | undefined}
      />

      {/* Spacer */}
      <div className="my-6" />

      {/* Work outputs */}
      <WorkOutputSection projectId={projectId} />
    </div>
  );
}
