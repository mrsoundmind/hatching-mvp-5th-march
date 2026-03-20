"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { cn } from "@/lib/utils";

export interface BentoTabConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  header: string;
  description: string;
  content: React.ReactNode;
  accentColor?: string;
}

interface BentoCardProps {
  tabs: BentoTabConfig[];
  title?: string;
  subtitle?: string;
  className?: string;
}

const BentoCard = ({ tabs, title, subtitle, className }: BentoCardProps) => {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const content = useMemo(() => {
    const found = tabs.find(t => t.id === activeTab.id);
    return found?.content ?? null;
  }, [activeTab.id, tabs]);

  return (
    <div className={cn("flex items-center justify-center w-full antialiased", className)}>
      <div className="group relative w-full max-w-xl overflow-hidden rounded-3xl sm:rounded-4xl border border-white/[0.06] bg-background/95 shadow-2xl shadow-primary/5 transition-all duration-500 hover:shadow-primary/10 hover:-translate-y-1 m-0">
        {(title || subtitle) && (
          <div className="p-4 sm:p-6 space-y-1.5 z-10 relative">
            {title && (
              <h2 className="text-xs text-slate-500 uppercase tracking-widest">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg sm:text-2xl text-slate-100 font-medium leading-snug max-w-[480px]">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="relative w-full h-[280px] sm:h-[320px] overflow-hidden rounded-2xl sm:rounded-[2rem]">
          <div className="absolute top-16 left-16 w-full h-full bg-background rounded-3xl border border-white/[0.04] opacity-80" />

          <div className="absolute top-8 left-24 w-full h-full bg-background rounded-tl-3xl shadow-xl flex flex-col overflow-hidden ring-6 ring-white/[0.03]">
            <div className="px-5 py-4 rounded-tl-3xl border-b border-white/[0.06] flex items-center relative backdrop-blur-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                <span className="text-xs text-slate-500/50 uppercase tracking-widest">
                  Workspace
                </span>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-36 border-r border-white/[0.04] p-2 flex flex-col gap-1 pt-6 bg-white/[0.01]">
                <LayoutGroup>
                  {tabs.map((tab) => {
                    const isActive = activeTab.id === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "relative flex items-center gap-1.5 p-2 rounded-xl text-xs transition-colors cursor-pointer",
                          isActive
                            ? "text-slate-100"
                            : "text-slate-500 hover:text-slate-300",
                        )}
                      >
                        {tab.icon && (
                          <span className="z-20 shrink-0 relative w-3.5 h-3.5 flex items-center justify-center">
                            {tab.icon}
                          </span>
                        )}
                        <span className="truncate z-20 relative font-medium text-[11px]">
                          {tab.label}
                        </span>
                        {tab.badge && (
                          <span
                            className={cn(
                              "ml-auto text-[8px] leading-none py-0.5 px-1 rounded-md tabular-nums transition-all z-20 relative",
                              isActive
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                : "bg-white/[0.04] text-slate-500 border border-transparent",
                            )}
                          >
                            {tab.badge}
                          </span>
                        )}

                        {isActive && (
                          <motion.div
                            layoutId="sidebar-pill"
                            className="absolute left-0 w-[2px] h-4 rounded-full z-30 border"
                            style={{ 
                              backgroundColor: tab.accentColor || '#818cf8',
                              borderColor: (tab.accentColor || '#818cf8') + '33'
                            }}
                            transition={{
                              type: "spring",
                              bounce: 0.2,
                              duration: 0.6,
                            }}
                          />
                        )}
                        {isActive && (
                          <motion.div
                            layoutId="backgroundIndicator"
                            className="absolute inset-0 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                            transition={{
                              type: "spring",
                              bounce: 0.2,
                              duration: 0.6,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </LayoutGroup>
              </div>

              <div className="flex-1 bg-background p-5 pt-6 flex flex-col gap-4 overflow-hidden relative">
                <header className="flex flex-col gap-0.5">
                  <h3 className="text-xs font-semibold text-slate-200 tracking-tight line-clamp-1 uppercase opacity-60">
                    {activeTab.header}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-normal leading-tight line-clamp-2">
                    {activeTab.description}
                  </p>
                </header>

                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={activeTab.id}
                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="flex-1"
                  >
                    {content}
                  </motion.div>
                </AnimatePresence>

                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoCard;
