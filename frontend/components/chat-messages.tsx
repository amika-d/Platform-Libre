'use client';

import React, { useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';
import { CitationsPanel } from './citations-panel';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SwirlAvatar } from './swirl-avatar';
import { MultiAgentProgress } from './multi-agent-progress';
import { Scorecard, ScorecardMetric } from './scorecard';
import { TrendList, TrendItem } from './trend-list';
import { AnalysisArtifact } from './analysis-artifact';
import { TypewriterRenderer } from './typewriter-renderer';
import { useState } from 'react';

const DEMO_METRICS: ScorecardMetric[] = [
  { label: 'Accuracy',   value: '94.2%', change: 3.1,  sparkline: [72, 75, 80, 78, 85, 91, 94] },
  { label: 'Latency',    value: '182ms', change: -8.4, sparkline: [240, 220, 210, 200, 195, 190, 182] },
  { label: 'Throughput', value: '1.4k',  change: 12,   sparkline: [900, 980, 1050, 1150, 1250, 1350, 1400] },
  { label: 'Error Rate', value: '0.3%',  change: -1.2, sparkline: [2.1, 1.8, 1.4, 1.0, 0.7, 0.5, 0.3] },
];

const DEMO_TRENDS: TrendItem[] = [
  { label: 'Model performance',    description: 'F1-score improved after fine-tuning on domain corpus.',       direction: 'up',      value: '+3.1%' },
  { label: 'Hallucination rate',   description: 'Citations grounding reduced fabricated claims significantly.', direction: 'down',    value: '-18%'  },
  { label: 'Token usage',          description: 'Average response length stable across past 7 days.',          direction: 'neutral', value: '~2.1k' },
  { label: 'User satisfaction',    description: 'Thumbs-up ratio based on last 500 sessions.',                direction: 'up',      value: '88%'   },
];


interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  selectedAgentIds?: string[];
}

export function ChatMessages({ messages, isLoading, selectedAgentIds }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [completedTypewriting, setCompletedTypewriting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const isLastMessage = (id: string, idx: number) => {
    return idx === messages.length - 1;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <SwirlAvatar size={48} className="mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-zinc-300 mb-2">Start a conversation</h2>
            <p className="text-sm text-zinc-500">Ask me anything about products</p>
          </div>
        </div>
      )}

      {messages.map((message, idx) => (
        <div
          key={message.id}
          className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} px-2 sm:px-4`}
        >
          {message.role === 'assistant' && (
            <SwirlAvatar size={32} className="mt-1" />
          )}

          <div
            className={`max-w-xs sm:max-w-md lg:max-w-2xl px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base ${
              message.role === 'user'
                ? 'bg-zinc-800 text-zinc-100 rounded-br-none'
                : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-bl-none'
            }`}
          >
            <TypewriterRenderer 
              content={message.content}
              active={message.role === 'assistant' && !completedTypewriting[message.id]}
              onComplete={() => setCompletedTypewriting(prev => ({ ...prev, [message.id]: true }))}
            />

            {message.role === 'assistant' && completedTypewriting[message.id] && (
              <>
                {message.analysis ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-700">
                    {isLastMessage(message.id, idx) && (message.analysis.active_domains?.length ?? 0) > 0 && (
                      <div className="mb-4">
                        <MultiAgentProgress
                          activeDomainIds={message.analysis.active_domains ?? []}
                          completed
                        />
                      </div>
                    )}
                    <AnalysisArtifact analysis={message.analysis} />
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-700">
                    <Scorecard title="Key Metrics" metrics={DEMO_METRICS} />
                    <TrendList title="Trend Summary" items={DEMO_TRENDS} />
                  </div>
                )}
              </>
            )}

            {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
              <div className="mt-3 pt-3">
                <CitationsPanel citations={message.citations} />
              </div>
            )}
          </div>

          {message.role === 'user' && (
            <Avatar className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 mt-1">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">U</AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-2 sm:gap-3 px-2 sm:px-4">
          <SwirlAvatar size={32} className="mt-1 shrink-0" />
          <MultiAgentProgress selectedAgentIds={selectedAgentIds} />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
