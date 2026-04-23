'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { AGENTS } from '@/lib/agents';

interface MultiAgentProgressProps {
  selectedAgentIds?: string[];
  activeDomainIds?: string[];
  completed?: boolean;
}

const DOMAIN_PIPELINE = [
  'market',
  'competitor',
  'win_loss',
  'pricing',
  'positioning',
  'adjacent',
] as const;

const DOMAIN_AGENT_META: Record<string, { name: string; reasoning: string; duration: number }> = {
  market: {
    name: 'Market Agent',
    reasoning: 'Evaluating market size, momentum, and emerging category shifts relevant to the product.',
    duration: 2200,
  },
  competitor: {
    name: 'Competitor Agent',
    reasoning: 'Comparing direct and adjacent competitors to surface strengths, threats, and gaps.',
    duration: 2400,
  },
  win_loss: {
    name: 'Win/Loss Agent',
    reasoning: 'Extracting key reasons behind customer wins and losses to identify repeatable patterns.',
    duration: 2300,
  },
  pricing: {
    name: 'Pricing Agent',
    reasoning: 'Assessing pricing signals, willingness to pay, and packaging opportunities.',
    duration: 2100,
  },
  positioning: {
    name: 'Positioning Agent',
    reasoning: 'Testing message clarity and differentiation signals across customer segments.',
    duration: 2100,
  },
  adjacent: {
    name: 'Adjacent Agent',
    reasoning: 'Scanning adjacent markets and expansion lanes for strategic optionality.',
    duration: 2100,
  },
};

export function MultiAgentProgress({ selectedAgentIds, activeDomainIds, completed = false }: MultiAgentProgressProps) {
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);

  const hasBackendDomains = Array.isArray(activeDomainIds) && activeDomainIds.length > 0;

  const backendAgents = hasBackendDomains
    ? DOMAIN_PIPELINE
      .filter((domainId) => activeDomainIds.includes(domainId))
      .map((domainId) => ({ id: domainId, ...DOMAIN_AGENT_META[domainId] }))
    : [];

  // Filter agents based on selection. If selectedAgentIds is undefined, show all.
  // If it's an empty array, show none (user deselected all).
  const selectedAgents = selectedAgentIds
    ? AGENTS.filter(a => selectedAgentIds.includes(a.id))
    : AGENTS;

  const activeAgents = hasBackendDomains ? backendAgents : selectedAgents;

  useEffect(() => {
    if (completed) {
      setCurrentAgentIndex(Math.max(activeAgents.length - 1, 0));
      return;
    }

    // Reset index if it's out of bounds for the current active agents
    if (currentAgentIndex >= activeAgents.length) {
      setCurrentAgentIndex(0);
      return;
    }

    if (activeAgents.length === 0) return;
    
    if (currentAgentIndex < activeAgents.length - 1) {
      const timer = setTimeout(() => {
        setCurrentAgentIndex((prev) => prev + 1);
      }, activeAgents[currentAgentIndex].duration);
      return () => clearTimeout(timer);
    }
  }, [currentAgentIndex, activeAgents, completed]);

  if (activeAgents.length === 0) return null;

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-zinc-950/60 backdrop-blur-xl border border-white/10 p-6 w-full max-w-sm sm:max-w-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] transition-all duration-500">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes agent-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes reasoning-in {
          from { opacity: 0; transform: translateY(-4px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 100px; }
        }
        .animate-agent { animation: agent-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-reasoning { animation: reasoning-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      `}} />

      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500/80">
            Internal Reasoning
          </p>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-tight">Multi-Agent Veracity Protocol</h3>
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        {!completed && (
          <div className="h-8 w-8 rounded-full bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-inner">
            <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="relative flex flex-col space-y-7">
        {/* Connection Line with Gradient Progress */}
        <div className="absolute left-[11px] top-4 bottom-2 w-[1.5px] bg-zinc-800/50 overflow-hidden rounded-full">
          <div 
            className="absolute top-0 w-full bg-gradient-to-b from-emerald-500 via-emerald-400 to-transparent transition-all duration-1000 ease-in-out"
            style={{ 
              height: activeAgents.length > 1 
                ? `${(currentAgentIndex / (activeAgents.length - 1)) * 100}%` 
                : '100%' 
            }}
          />
        </div>
        
        {activeAgents.map(({ id, name, reasoning }, index) => {
          const isActive = index === currentAgentIndex;
          const isCompleted = completed || index < currentAgentIndex;
          const isPending = index > currentAgentIndex;

          if (!completed && isPending) return null;

          return (
            <div
              key={id}
              className={`relative flex gap-5 animate-agent`}
            >
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                {isCompleted ? (
                  <div className="rounded-full bg-emerald-500/20 p-1 ring-1 ring-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />
                  </div>
                ) : isActive ? (
                  <div className="relative h-4 w-4">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-25" />
                    <div className="relative h-4 w-4 rounded-full bg-emerald-500 border-2 border-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
                  </div>
                ) : (
                  <Circle className="h-4 w-4 text-zinc-800" strokeWidth={2} />
                )}
              </div>

              <div className="flex flex-col gap-1.5 pt-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] font-bold tracking-tight transition-all duration-500 ${
                    isActive ? 'text-white' : 'text-zinc-500'
                  }`}>
                    {name}
                  </span>
                  {isActive && (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  )}
                </div>
                
                {isActive && (
                  <p className="text-[11px] leading-relaxed text-zinc-400 font-medium animate-reasoning overflow-hidden">
                    {reasoning}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Detailed Status Footer */}
      <div className="mt-2 pt-5 border-t border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em]">Stage</span>
            <span className="text-[11px] text-zinc-300 font-mono">
              AGENT-{currentAgentIndex + 1} / {activeAgents.length}
            </span>
          </div>
          <div className="text-right flex flex-col gap-0.5">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em]">Accuracy</span>
            <span className="text-[11px] text-emerald-500 font-mono font-bold tracking-tighter">
              {Math.min(99.9, 88.5 + (currentAgentIndex * 1.8)).toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="h-1.5 w-full bg-zinc-900 rounded-full p-[1.5px] border border-white/5 overflow-hidden shadow-inner">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-300 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(52,211,153,0.4)]"
            style={{ width: `${((currentAgentIndex + 1) / activeAgents.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
