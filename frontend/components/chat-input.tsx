'use client';

import React, { useState, useRef } from 'react';
import { ArrowUp, Settings2, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AGENTS } from '@/lib/agents';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedAgentIds: string[];
  onAgentsChange: (ids: string[]) => void;
}

export function ChatInput({ onSend, isLoading, selectedAgentIds, onAgentsChange }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const toggleAgent = (id: string) => {
    if (selectedAgentIds.includes(id)) {
      onAgentsChange(selectedAgentIds.filter(i => i !== id));
    } else {
      onAgentsChange([...selectedAgentIds, id]);
    }
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 px-4 pointer-events-none z-50">
      <div className="mx-auto max-w-2xl pointer-events-auto relative">
        {/* Agent Drop-up Menu */}
        {showAgentMenu && (
          <div className="absolute bottom-full left-0 mb-3 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Processing Chain</p>
            </div>
            <div className="flex flex-col gap-0.5">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-200">{agent.name}</span>
                    <span className="text-[9px] text-zinc-500 line-clamp-1">{agent.reasoning}</span>
                  </div>
                  <div className={`h-4 w-4 rounded border transition-all flex items-center justify-center ${
                    selectedAgentIds.includes(agent.id) 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'border-white/20 group-hover:border-white/40'
                  }`}>
                    {selectedAgentIds.includes(agent.id) && <Check className="h-3 w-3 text-white" strokeWidth={4} />}
                  </div>
                </button>
              ))}
            </div>
            {selectedAgentIds.length === 0 && (
              <p className="mt-2 text-[10px] text-amber-500/80 px-3 italic">
                No agents selected. All agents will run by default.
              </p>
            )}
          </div>
        )}

        <div className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowAgentMenu(!showAgentMenu)}
                className={`h-10 w-10 p-0 shrink-0 border transition-all duration-200 rounded-xl flex items-center justify-center ${
                  showAgentMenu ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/20 hover:bg-white/20'
                }`}
                aria-label="Configure agents"
              >
                <Settings2 className={`h-4.5 w-4.5 transition-colors ${showAgentMenu ? 'text-emerald-400' : 'text-zinc-300'}`} />
              </button>
            </div>

            <Textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 128) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask anything..."
              rows={1}
              disabled={isLoading}
              className="min-h-10 flex-1 bg-white/5 border border-white/10 text-zinc-100 placeholder-zinc-400 resize-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/20 rounded-xl transition-all duration-200 hover:bg-white/10"
            />
            <Button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="h-10 w-10 p-0 shrink-0 bg-white/5 border border-white/20 hover:bg-white/20 disabled:opacity-30 transition-all duration-200 rounded-xl"
            >
              <ArrowUp className="w-4 h-4 text-zinc-300" />
            </Button>
          </form>
          <p className="text-center text-[10px] text-white/40 pb-2">
            AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}
