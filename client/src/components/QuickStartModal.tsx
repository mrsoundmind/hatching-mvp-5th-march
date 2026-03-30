import FocusTrap from 'focus-trap-react';
import { useState } from 'react';
import { X, Sparkles, Zap } from 'lucide-react';

interface QuickStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWithIdea: () => void;
  onUseStarterPack: () => void;
}

export default function QuickStartModal({
  isOpen,
  onClose,
  onStartWithIdea,
  onUseStarterPack
}: QuickStartModalProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <FocusTrap active={isOpen}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-hatchin-card rounded-2xl w-full max-w-md border border-hatchin-border-subtle shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          {/* Header */}
          <div className="p-6 border-b border-hatchin-border-subtle flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-hatchin-text-bright mb-1" id="modal-title">
                How do you want to start?
              </h2>
              <p className="text-muted-foreground text-sm">
                Pick a path. You can always change it later.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-hatchin-text-bright transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Options */}
          <div className="p-6 space-y-4">
            {/* Start with Idea Option */}
            <button
              onClick={onStartWithIdea}
              onMouseEnter={() => setHoveredOption('idea')}
              onMouseLeave={() => setHoveredOption(null)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${hoveredOption === 'idea'
                  ? 'border-hatchin-blue bg-hatchin-blue/5 transform scale-[0.98]'
                  : 'border-hatchin-border-subtle hover:border-hatchin-blue/50'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${hoveredOption === 'idea'
                    ? 'bg-hatchin-blue text-white'
                    : 'bg-hatchin-surface text-hatchin-blue'
                  }`}>
                  <Sparkles size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-hatchin-text-bright font-medium mb-1" id="modal-title">
                    Start with an idea
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Tell Maya your idea in plain English. She'll build the plan and team for you.
                  </p>
                </div>
              </div>
            </button>

            {/* Use Starter Pack Option */}
            <button
              onClick={onUseStarterPack}
              onMouseEnter={() => setHoveredOption('starter')}
              onMouseLeave={() => setHoveredOption(null)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${hoveredOption === 'starter'
                  ? 'border-hatchin-blue bg-hatchin-blue/5 transform scale-[0.98]'
                  : 'border-hatchin-border-subtle hover:border-hatchin-blue/50'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${hoveredOption === 'starter'
                    ? 'bg-hatchin-blue text-white'
                    : 'bg-hatchin-surface text-hatchin-blue'
                  }`}>
                  <Zap size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-hatchin-text-bright font-medium mb-1">
                    Use a starter pack
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Pick a ready-made team. Perfect for SaaS, e-commerce, or mobile apps.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <p className="text-muted-foreground text-xs text-center">
              Your AI team can be customized anytime through chat.
            </p>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}