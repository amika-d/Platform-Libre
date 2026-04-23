'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  LayoutList,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface TrendItem {
  label: string;
  description?: string;
  direction: TrendDirection;
  value?: string;
}

interface TrendListProps {
  title?: string;
  items: TrendItem[];
  defaultOpen?: boolean;
}

const directionConfig: Record<
  TrendDirection,
  { 
    Icon: any; 
    dotClass: string; 
    valueClass: string;
    bgClass: string;
    Arrow: any;
  }
> = {
  up: { 
    Icon: TrendingUp, 
    dotClass: 'text-emerald-400', 
    valueClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    Arrow: ArrowUpRight
  },
  down: { 
    Icon: TrendingDown, 
    dotClass: 'text-rose-400', 
    valueClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10 border-rose-500/20',
    Arrow: ArrowDownRight
  },
  neutral: { 
    Icon: Minus, 
    dotClass: 'text-zinc-400', 
    valueClass: 'text-zinc-400',
    bgClass: 'bg-zinc-500/10 border-zinc-500/20',
    Arrow: Minus
  },
};

export function TrendList({ title = 'Trend Summary', items, defaultOpen = true }: TrendListProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="my-4 rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-300">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes itemFadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-item-in { animation: itemFadeIn 0.4s ease-out forwards; }
      `}} />

      {/* Collapse header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="group flex w-full items-center justify-between px-4 py-3 text-left transition-all hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-900 border border-white/5">
            <LayoutList className="h-3 w-3 text-blue-400" />
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
      <div className={`transition-all duration-500 ease-in-out ${open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-4 pb-4">
          <ul className="flex flex-col gap-2">
            {items.map((item, i) => {
              const cfg = directionConfig[item.direction];
              return (
                <li 
                  key={i} 
                  className="animate-item-in group/item relative flex items-center gap-4 rounded-xl border border-white/5 bg-zinc-900/30 p-3 hover:bg-zinc-900/60 hover:border-white/10 transition-all"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.bgClass} transition-transform duration-300 group-hover/item:scale-110 shadow-inner`}>
                    <cfg.Icon className={`h-5 w-5 ${cfg.dotClass}`} strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[13px] font-bold text-zinc-100 group-hover/item:text-white transition-colors truncate">
                        {item.label}
                      </span>
                      {item.value && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[12px] font-black tracking-tight tabular-nums ${cfg.valueClass}`}>
                            {item.value}
                          </span>
                          <cfg.Arrow className={`h-3 w-3 ${cfg.dotClass}`} />
                        </div>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] leading-relaxed text-zinc-500 group-hover/item:text-zinc-400 transition-colors line-clamp-2 italic">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Hover Accent */}
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 bg-transparent group-hover/item:h-3/4 transition-all duration-300 rounded-full ${
                    item.direction === 'up' ? 'group-hover/item:bg-emerald-500' : 
                    item.direction === 'down' ? 'group-hover/item:bg-rose-500' : 'group-hover/item:bg-zinc-500'
                  }`} />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
