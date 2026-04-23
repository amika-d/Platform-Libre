'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Coins, Zap } from 'lucide-react';

const TOKEN_LIMIT = 100_000;

interface UserProfilePanelProps {
  tokensUsed: number;
}

export function UserProfilePanel({ tokensUsed }: UserProfilePanelProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [open]);

  const tokensLeft = Math.max(TOKEN_LIMIT - tokensUsed, 0);
  const pct = Math.min((tokensUsed / TOKEN_LIMIT) * 100, 100);
  
  const barGradient = pct > 80 
    ? 'from-rose-600 via-rose-500 to-rose-400' 
    : pct > 50 
    ? 'from-amber-600 via-amber-500 to-amber-400' 
    : 'from-emerald-600 via-emerald-500 to-emerald-400';

  return (
    <div ref={ref} className="relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes panel-in {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-panel { animation: panel-in 0.2s cubic-bezier(0.2, 0, 0, 1) forwards; }
      `}} />

      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="User profile"
        className={`group relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300 ${
          open
            ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : 'border-white/10 bg-zinc-900 hover:border-white/20 hover:bg-zinc-800 hover:shadow-lg'
        }`}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all duration-500" />
        <User className={`h-4.5 w-4.5 transition-colors duration-300 ${open ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
        
        {/* Status dot */}
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="animate-panel absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          
          {/* Header/User section */}
          <div className="relative overflow-hidden px-5 py-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-50" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 shadow-inner group transition-transform hover:scale-105 duration-300">
                <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 blur-sm group-hover:bg-emerald-500/10" />
                <User className="relative h-6 w-6 text-zinc-300" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold tracking-tight text-white">Demo User</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-500/80">Premium Access</p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Token usage section */}
          <div className="px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Resource Allocation</span>
              </div>
              <Zap className="h-3 w-3 text-amber-500 animate-pulse" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between group/val cursor-default">
                <span className="text-[12px] text-zinc-400 group-hover/val:text-zinc-300 transition-colors">Total Consumed</span>
                <span className="tabular-nums text-[13px] font-bold text-white tracking-tight">
                  {tokensUsed.toLocaleString()} <span className="text-[10px] text-zinc-500 font-medium">TOKENS</span>
                </span>
              </div>
              
              <div className="flex items-center justify-between group/val cursor-default">
                <span className="text-[12px] text-zinc-400 group-hover/val:text-zinc-300 transition-colors">Remaining Limit</span>
                <span className="tabular-nums text-[13px] font-bold text-emerald-400 tracking-tight">
                  {tokensLeft.toLocaleString()}
                </span>
              </div>

              {/* Enhanced Progress bar */}
              <div className="relative pt-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900 border border-white/5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 cubic-bezier(0.2, 0, 0, 1) bg-gradient-to-r ${barGradient} shadow-[0_0_15px_rgba(16,185,129,0.3)]`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-bold tracking-tighter text-zinc-600">
                  <span>SYSTEM STARTINGUP_NODE</span>
                  <span>{((TOKEN_LIMIT - tokensUsed) / 1000).toFixed(1)}K CAPACITY</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

          {/* Actions section */}
          <div className="p-2">
            <button
              onClick={() => {
                setOpen(false);
                window.location.href = '/login';
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-zinc-400 transition-all hover:bg-rose-500/10 hover:text-rose-400"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-white/5 group-hover:border-rose-500/30 group-hover:bg-rose-500/5 transition-all">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold tracking-tight">Terminate Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
