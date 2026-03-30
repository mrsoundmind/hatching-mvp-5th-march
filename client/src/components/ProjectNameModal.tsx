import FocusTrap from 'focus-trap-react';
import { useState, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface ProjectNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onConfirm: (name: string, description?: string) => void;
  templateName?: string;
  templateDescription?: string;
  isLoading?: boolean;
}

export default function ProjectNameModal({
  isOpen,
  onClose,
  onBack,
  onConfirm,
  templateName = '',
  templateDescription = '',
  isLoading = false
}: ProjectNameModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const nameError = touched && dirty && projectName.trim().length === 0 ? 'Project name is required' :
    projectName.length > 100 ? 'Name must be 100 characters or fewer' : '';

  // Pre-fill with template data when modal opens
  useEffect(() => {
    if (isOpen) {
      setTouched(false);
      setDirty(false);
      if (templateName) {
        setProjectName(templateName);
        setProjectDescription(templateDescription);
      }
    }
  }, [isOpen, templateName, templateDescription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onConfirm(projectName.trim(), projectDescription.trim() || undefined);
    }
  };

  const isValid = projectName.trim().length > 0;

  if (!isOpen) return null;

  return (
    <FocusTrap active={isOpen}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-hatchin-card rounded-2xl w-full max-w-md border border-hatchin-border-subtle shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header */}
        <div className="p-6 border-b border-hatchin-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="text-muted-foreground hover:text-hatchin-text-bright transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-hatchin-text-bright mb-1" id="modal-title">
                Name Your Project
              </h2>
              <p className="text-muted-foreground text-sm">
                Customize your project name and description
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-hatchin-text-bright transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Name Input */}
          <div>
            <label className="block text-hatchin-text-bright text-sm font-medium mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => { setProjectName(e.target.value.slice(0, 100)); setDirty(true); }}
              onBlur={() => setTouched(true)}
              placeholder="Enter your project name"
              className={`w-full px-4 py-3 bg-hatchin-surface border rounded-xl text-hatchin-text-bright placeholder-muted-foreground focus:outline-none focus:ring-1 transition-colors ${
                nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-hatchin-border-subtle focus:border-hatchin-blue focus:ring-hatchin-blue'
              }`}
              autoFocus
              disabled={isLoading}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
              maxLength={100}
            />
            <div className="flex justify-between mt-1">
              {nameError ? (
                <p id="name-error" className="text-red-500 text-xs">{nameError}</p>
              ) : <span />}
              <span className="text-xs text-muted-foreground">{projectName.length}/100</span>
            </div>
          </div>

          {/* Project Description Input */}
          <div>
            <label className="block text-hatchin-text-bright text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Briefly describe what you're building"
              rows={3}
              className="w-full px-4 py-3 bg-hatchin-surface border border-hatchin-border-subtle rounded-xl text-hatchin-text-bright placeholder-muted-foreground focus:border-hatchin-blue focus:outline-none focus:ring-1 focus:ring-hatchin-blue transition-colors resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack || onClose}
              className="flex-1 px-4 py-3 bg-hatchin-surface text-hatchin-text-bright rounded-xl hover:bg-hatchin-border-subtle transition-colors"
              disabled={isLoading}
            >
              Go back
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className={`flex-1 px-4 py-3 rounded-xl transition-colors font-medium ${
                isValid && !isLoading
                  ? 'bg-hatchin-blue text-white hover:bg-hatchin-blue/90'
                  : 'bg-hatchin-border-subtle text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </FocusTrap>
  );
}