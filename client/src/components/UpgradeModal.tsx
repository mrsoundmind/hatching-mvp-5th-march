import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Zap, Crown, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "project_limit" | "autonomy" | "daily_cap" | string;
}

const REASON_HEADLINES: Record<string, { title: string; description: string }> = {
  project_limit: {
    title: "You've reached the project limit",
    description:
      "Free accounts support up to 3 projects. Go Pro for unlimited projects and keep building.",
  },
  autonomy: {
    title: "Autonomy is a Pro feature",
    description:
      "Let your Hatches work in the background, hand off tasks between specialists, and execute autonomously with Pro.",
  },
  daily_cap: {
    title: "What a productive day!",
    description:
      "You've been working hard with your team today. Upgrade to Pro for 4x the daily capacity and full autonomous execution.",
  },
};

const DEFAULT_HEADLINE = {
  title: "Unlock the full Hatchin experience",
  description:
    "Pro gives your team unlimited projects, smarter models, and full autonomous execution.",
};

interface TierFeature {
  label: string;
  free: string;
  pro: string;
}

const TIER_FEATURES: TierFeature[] = [
  { label: "Chat messages", free: "Unlimited", pro: "Unlimited" },
  { label: "Projects", free: "3", pro: "Unlimited" },
  { label: "AI agents", free: "All 30", pro: "All 30" },
  { label: "AI quality", free: "Pro model", pro: "Pro model" },
  { label: "Autonomous execution", free: "--", pro: "50 tasks/day" },
  { label: "Full autonomy + handoffs", free: "--", pro: "Included" },
];

export default function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const headline = (reason && REASON_HEADLINES[reason]) || DEFAULT_HEADLINE;
  const monthlyPrice = isAnnual ? "$15.83" : "$19";
  const billingLabel = isAnnual ? "/mo, billed annually" : "/mo";
  const totalLabel = isAnnual ? "$190/year" : "$19/month";

  async function handleUpgrade() {
    setIsLoading(true);
    try {
      const plan = isAnnual ? "annual" : "monthly";
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-hatchin-card border-hatchin-border-subtle max-w-xl p-0 gap-0 overflow-hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {/* Header */}
              <DialogHeader className="p-6 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-orange-400 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  <DialogTitle className="text-lg font-semibold text-hatchin-text-bright">
                    {headline.title}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-hatchin-text-muted mt-1">
                  {headline.description}
                </DialogDescription>
              </DialogHeader>

              {/* Billing toggle */}
              <div className="px-6 pb-4">
                <div className="flex items-center justify-center gap-3 p-1 rounded-lg bg-hatchin-surface">
                  <button
                    onClick={() => setIsAnnual(false)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      !isAnnual
                        ? "bg-hatchin-card text-hatchin-text-bright shadow-sm"
                        : "text-hatchin-text-muted hover:text-hatchin-text-bright"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isAnnual
                        ? "bg-hatchin-card text-hatchin-text-bright shadow-sm"
                        : "text-hatchin-text-muted hover:text-hatchin-text-bright"
                    }`}
                  >
                    Annual
                    <span className="text-xs px-1.5 py-0.5 rounded bg-hatchin-orange/15 text-hatchin-orange font-semibold">
                      Save 17%
                    </span>
                  </button>
                </div>
              </div>

              {/* Tier comparison */}
              <div className="px-6 pb-2">
                <div className="grid grid-cols-3 gap-0 text-sm">
                  {/* Column headers */}
                  <div className="py-2 text-hatchin-text-muted font-medium">Feature</div>
                  <div className="py-2 text-center text-hatchin-text-muted font-medium">Free</div>
                  <div className="py-2 text-center font-medium">
                    <span className="bg-gradient-to-r from-indigo-400 to-orange-400 bg-clip-text text-transparent">
                      Pro
                    </span>
                  </div>

                  {/* Feature rows */}
                  {TIER_FEATURES.map((feature) => (
                    <FeatureRow key={feature.label} feature={feature} />
                  ))}
                </div>
              </div>

              {/* Price + CTA */}
              <div className="p-6 pt-4 border-t border-hatchin-border-subtle bg-hatchin-surface/50">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-hatchin-text-bright">
                        {monthlyPrice}
                      </span>
                      <span className="text-sm text-hatchin-text-muted">{billingLabel}</span>
                    </div>
                    <p className="text-xs text-hatchin-text-muted mt-0.5">{totalLabel}</p>
                  </div>
                  {isAnnual && (
                    <span className="text-xs text-hatchin-orange font-medium">
                      You save $38/year
                    </span>
                  )}
                </div>

                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Redirecting...
                    </span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Upgrade to Pro
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-xs text-hatchin-text-muted text-center mt-3">
                  Cancel anytime. No commitment.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function FeatureRow({ feature }: { feature: TierFeature }) {
  const isProOnly = feature.free === "--";

  return (
    <>
      <div className="py-2.5 text-hatchin-text-bright border-t border-hatchin-border-subtle">
        {feature.label}
      </div>
      <div className="py-2.5 text-center border-t border-hatchin-border-subtle text-hatchin-text-muted">
        {isProOnly ? (
          <X className="w-4 h-4 mx-auto text-hatchin-text-muted/50" />
        ) : (
          feature.free
        )}
      </div>
      <div className="py-2.5 text-center border-t border-hatchin-border-subtle text-hatchin-text-bright font-medium">
        {isProOnly ? (
          <Check className="w-4 h-4 mx-auto text-hatchin-green" />
        ) : (
          <span className="text-hatchin-green">{feature.pro}</span>
        )}
      </div>
    </>
  );
}
