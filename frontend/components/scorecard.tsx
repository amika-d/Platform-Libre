'use client';

import { useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export interface ScorecardMetric {
  label: string;
  value: string;
  change?: number;
  sparkline?: number[];
}

interface ScorecardProps {
  title?: string;
  metrics: ScorecardMetric[];
  defaultOpen?: boolean;
}

function MiniSparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`gradient-${isUp ? 'up' : 'down'}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.4" />
          <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M0,${h} L${points} L${w},${h} Z`}
        fill={`url(#gradient-${isUp ? 'up' : 'down'})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#34d399' : '#fb7185'}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChangeBadge({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
      up ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
    }`}>
      {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {up ? '+' : ''}{change}%
    </span>
  );
}

export function Scorecard({ title = 'Key Metrics', metrics, defaultOpen = true }: ScorecardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="my-4 rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-300">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slideDown 0.3s ease-out forwards; }
      `}} />

      {/* Collapse header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="group flex w-full items-center justify-between px-4 py-3 text-left transition-all hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-900 border border-white/5">
            <Activity className="h-3 w-3 text-emerald-500" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400 group-hover:text-zinc-200 transition-colors">
            {title}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform duration-300 ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>

      {/* Collapsible body */}
      <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((m, idx) => {
              const isUp = m.change === undefined || m.change >= 0;
              return (
                <div 
                  key={m.label} 
                  className="animate-slide-down flex flex-col gap-2 rounded-xl border border-white/5 bg-zinc-900/50 p-3 hover:bg-zinc-900/80 hover:border-white/10 transition-all group/card"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 group-hover/card:text-zinc-400 transition-colors">{m.label}</span>
                    {m.change !== undefined && <ChangeBadge change={m.change} />}
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-xl font-bold tracking-tight text-white tabular-nums group-hover/card:scale-105 origin-left transition-transform duration-300">{m.value}</span>
                    <div className="flex items-end justify-between h-6">
                      {m.sparkline && m.sparkline.length > 1 ? (
                        <MiniSparkline data={m.sparkline} isUp={isUp} />
                      ) : (
                        <div className="w-full h-[1px] bg-zinc-800" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
