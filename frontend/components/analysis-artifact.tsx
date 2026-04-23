'use client';

import React from 'react';
import { TrendList, TrendItem } from './trend-list';
import { MarkdownRenderer } from './markdown-renderer';
import type { AnalysisResult } from '@/lib/types';
import { Target } from 'lucide-react';

interface AnalysisArtifactProps {
  analysis: AnalysisResult;
}

export function AnalysisArtifact({ analysis }: AnalysisArtifactProps) {
  // Map opportunities to TrendItems
  const opportunities: TrendItem[] = analysis.top_opportunities.map(opt => ({
    label: opt,
    direction: 'up',
  }));

  // Map risks to TrendItems
  const risks: TrendItem[] = analysis.top_risks.map(risk => ({
    label: risk,
    direction: 'down',
  }));

  // Map actions to TrendItems
  const actions: TrendItem[] = analysis.recommended_actions.map(action => ({
    label: action,
    direction: 'neutral',
  }));

  const domainEntries = Object.entries(analysis.domains).filter(([, domain]) => (
    domain.confidence > 0
    || domain.key_insight.trim().length > 0
    || domain.findings.length > 0
  ));

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Summary Section */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Executive Summary</h4>
        </div>
        <MarkdownRenderer content={analysis.summary} />
      </div>

      {/* Strategic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opportunities.length > 0 && (
          <TrendList 
            title="Strategic Opportunities" 
            items={opportunities} 
          />
        )}
        {risks.length > 0 && (
          <TrendList 
            title="Critical Risks" 
            items={risks} 
          />
        )}
      </div>

      {/* Domain Analysis Sections */}
      {domainEntries.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Target className="h-4 w-4 text-blue-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">Deep Domain Synthesis</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {domainEntries.map(([key, domain]) => (
            <div key={key} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-zinc-950/40 p-4 transition-all hover:bg-zinc-900/40 group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  {key.replace('_', ' ')}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                  domain.confidence > 0.8 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  {(domain.confidence * 100).toFixed(0)}% Match
                </span>
              </div>
              
              <p className="text-[12px] font-bold text-zinc-100 leading-tight">
                {domain.key_insight}
              </p>
              
              <ul className="space-y-1.5">
                {domain.findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-700" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {actions.length > 0 && (
        <TrendList 
          title="Recommended Actions" 
          items={actions} 
        />
      )}
    </div>
  );
}
