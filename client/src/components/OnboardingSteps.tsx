import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStepsProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/* ── inline reusable slide layout ─────────────────────────────── */

interface SlideProps {
  illustration: React.ReactNode;
  promptText: string;
  replyText?: string;
  delayText?: number;
}

function ChatSlide({ illustration, promptText, replyText, delayText = 400 }: SlideProps) {
  const [displayed, setDisplayed] = useState("");
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setShowBubble(false);
    let i = 0;
    const t = setInterval(() => {
      setDisplayed(promptText.slice(0, ++i));
      if (i >= promptText.length) {
        clearInterval(t);
        if (replyText) {
          setTimeout(() => setShowBubble(true), delayText);
        }
      }
    }, 35); // slightly faster typing so user isn't stuck waiting
    return () => clearInterval(t);
  }, [promptText, replyText, delayText]);

  return (
    <div className="w-full h-full flex flex-col justify-end gap-5">
      {/* Contextual Illustration (Top) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} /* The slow start! */
        className="w-full flex-1 min-h-[120px] flex items-center justify-center pt-2"
      >
        {illustration}
      </motion.div>

      {/* Mock Chat / Log (Bottom) */}
      <div className="w-full rounded-xl bg-hatchin-surface-elevated/80 backdrop-blur-md border border-hatchin-border-subtle p-3.5 shadow-lg relative z-10">
        <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3.5 py-2.5 mb-2.5 shadow-inner">
          <span className="text-sm text-hatchin-text-bright min-h-[20px] leading-relaxed">{displayed}</span>
          <span className="w-0.5 h-4 bg-hatchin-blue animate-pulse rounded-sm flex-shrink-0" />
        </div>
        <AnimatePresence>
          {showBubble && replyText && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
              className="flex items-start gap-3 mt-3"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#9F7BFF] to-[#6C82FF] flex-shrink-0 shadow-[0_0_10px_rgba(159,123,255,0.4)] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/50" />
              </div>
              <div className="bg-hatchin-blue/10 border border-hatchin-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-indigo-200 leading-relaxed shadow-sm">
                {replyText}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Illustrations ─────────────────────────────────────────────── */

const IdeaCoreSvg = () => (
  <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
    <motion.circle 
      cx="50" cy="50" r="14" fill="url(#core-glow)" 
      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }} 
      transition={{ duration: 3, repeat: Infinity }} 
    />
    <path d="M50 20 L50 30 M50 80 L50 70 M20 50 L30 50 M80 50 L70 50" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" className="opacity-50" />
    <motion.circle cx="50" cy="50" r="28" fill="none" stroke="url(#core-glow)" strokeWidth="1" strokeDasharray="4 6" animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
    <defs>
      <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#c4b5fd" />
        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const TeamGenesisSvg = () => (
  <svg viewBox="0 0 100 100" className="w-24 h-24">
    <motion.circle cx="50" cy="50" r="8" fill="#4f46e5" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="drop-shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
    
    <motion.line x1="50" y1="50" x2="25" y2="25" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="2 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.5 }} />
    <motion.circle cx="25" cy="25" r="12" fill="#3b82f6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: 'spring' }} className="drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />

    <motion.line x1="50" y1="50" x2="75" y2="30" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="2 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.8 }} />
    <motion.circle cx="75" cy="30" r="10" fill="#db2777" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3, type: 'spring' }} className="drop-shadow-[0_0_8px_rgba(219,39,119,0.6)]" />

    <motion.line x1="50" y1="50" x2="50" y2="80" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="2 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 1.1 }} />
    <motion.circle cx="50" cy="80" r="10" fill="#d97706" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.6, type: 'spring' }} className="drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]" />
  </svg>
);

const BrainSvg = () => (
  <svg viewBox="0 0 100 100" className="w-20 h-20">
    <motion.path 
      d="M30 40 C30 20, 70 20, 70 40 C80 40, 80 60, 70 60 C70 80, 30 80, 30 60 C20 60, 20 40, 30 40 Z" 
      fill="none" stroke="#6C82FF" strokeWidth="2" strokeDasharray="4 4"
      animate={{ strokeDashoffset: -20 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    />
    {/* Floating nodes */}
    <motion.circle cx="45" cy="45" r="3" fill="#47DB9A" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} />
    <motion.circle cx="60" cy="35" r="4" fill="#6C82FF" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.5 }} />
    <motion.circle cx="50" cy="55" r="3" fill="#9F7BFF" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 2 }} />
  </svg>
);

const ChatLoopSvg = () => (
  <svg viewBox="0 0 100 100" className="w-24 h-24">
    <motion.path 
      d="M20 50 Q50 20 80 50" fill="none" stroke="url(#grad1)" strokeWidth="3" strokeLinecap="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }} 
    />
    <motion.path 
      d="M80 50 Q50 80 20 50" fill="none" stroke="url(#grad2)" strokeWidth="3" strokeLinecap="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 1.5, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }} 
    />
    <motion.circle cx="20" cy="50" r="6" fill="#6C82FF" className="drop-shadow-[0_0_10px_rgba(108,130,255,0.5)]" />
    <motion.circle cx="80" cy="50" r="6" fill="#9F7BFF" className="drop-shadow-[0_0_10px_rgba(159,123,255,0.5)]" />
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6C82FF" />
        <stop offset="100%" stopColor="#9F7BFF" />
      </linearGradient>
      <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#9F7BFF" />
        <stop offset="100%" stopColor="#47DB9A" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── step definitions ─────────────────────────────────────────── */
const steps = [
  {
    id: 1,
    title: "1. Describe your idea",
    description: "Tell Maya what you want to build. Just a sentence or a quick brain dump is enough to spark the process.",
    preview: <ChatSlide 
      illustration={<IdeaCoreSvg />}
      promptText="Building a fitness tracking app, but strictly for competitive marathon runners..." 
      replyText="I've got it. That's a solid niche. Let me hatch a specialized team to handle this!" 
      delayText={500}
    />,
  },
  {
    id: 2,
    title: "2. Watch your team hatch",
    description: "Maya immediately spins up specialized autonomous agents: Designer, Developer, Product Manager. Ready in seconds.",
    preview: <ChatSlide 
      illustration={<TeamGenesisSvg />}
      promptText="Assembling your autonomous specialists..." 
      replyText="Your Product Manager, Senior DevOps, and UI Designer are online and sync'd. Let's go!" 
      delayText={1000}
    />,
  },
  {
    id: 3,
    title: "3. Your AI remembers everything",
    description: "Every file, objective, and chat shapes context. The team builds a comprehensive, shared memory of exactly what your project is.",
    preview: <ChatSlide 
      illustration={<BrainSvg />}
      promptText="/save-memory Focus on iOS first, Swift native." 
      replyText="Stored securely in Project Brain. The team will prioritize native iOS conventions." 
      delayText={600}
    />,
  },
  {
    id: 4,
    title: "4. Direct and delegate",
    description: "You're the CEO. Chat with the team to set priorities, request features, or assign massive tasks. They run the heavy lifting.",
    preview: <ChatSlide 
      illustration={<ChatLoopSvg />}
      promptText="@Team let's wireframe the onboarding flow today." 
      replyText="On it. I'll sketch the UX logic while the developer scaffolds the views. Check the task board." 
      delayText={400}
    />,
  },
];

/* ── main component ───────────────────────────────────────────── */
export function OnboardingSteps({ isOpen, onClose, onComplete }: OnboardingStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // reset to slide 0 each time modal opens
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else onComplete();
  };
  const prevStep = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const stepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-hatchin-panel shadow-2xl border border-hatchin-border-subtle p-0 overflow-hidden">
        <DialogTitle className="sr-only">Hatchin onboarding steps</DialogTitle>
        <DialogDescription className="sr-only">
          Walkthrough of how Hatchin teams and project memory work.
        </DialogDescription>

        <div className="relative">
          {/* Skip Header */}
          <div className="flex justify-between items-center px-6 pt-5 pb-2">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest bg-hatchin-border-subtle/40 px-3 py-1 rounded-full">
              {currentStep + 1} of {steps.length}
            </div>
            <button
              onClick={onComplete}
              className="group flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground hover:text-hatchin-text-bright transition-colors text-sm font-medium"
            >
              <SkipForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              Skip
            </button>
          </div>

          {/* Animated slide content */}
          {/* Increased container height significantly to prevent cramped content. */}
          <div className="px-8 pb-6 min-h-[360px] flex flex-col pt-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={stepData.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full flex flex-col"
              >
                {/* Visual Area (Top) */}
                <div className="flex-1 w-full min-h-[220px]">
                  {stepData.preview}
                </div>

                {/* Text Area (Bottom) */}
                <div className="text-center mt-8 space-y-3">
                  <h2 className="text-xl font-bold text-hatchin-text-bright tracking-tight">
                    {stepData.title}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                    {stepData.description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-3 py-4 border-t border-white/5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`transition-all duration-300 rounded-full ${i === currentStep
                  ? "w-8 h-1.5 bg-gradient-to-r from-hatchin-blue to-[#9F7BFF] shadow-[0_0_8px_rgba(108,130,255,0.4)]"
                  : "w-1.5 h-1.5 bg-hatchin-border-subtle hover:bg-hatchin-blue/40"
                  }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-8 pb-8 pt-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-hatchin-text-bright transition-colors disabled:opacity-0 disabled:cursor-not-allowed text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={nextStep}
              className="group flex items-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-gray-100 shadow-md rounded-lg transition-all text-sm font-bold active:scale-[0.98]"
            >
              {currentStep === steps.length - 1 ? "Start Building!" : "Continue"}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
