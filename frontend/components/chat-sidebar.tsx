'use client';

import React from 'react';
import { Plus, Menu, X } from 'lucide-react';
import type { SessionSummary } from '@/lib/types';

interface ChatSidebarProps {
  sessions: SessionSummary[];
  activeSessionId: string;
  onNewChat: () => Promise<void> | void;
  onSelectSession: (sessionId: string) => Promise<void> | void;
  isSessionsLoading?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  isSessionsLoading = false,
  isOpen = true,
  onClose,
  onToggle,
}: ChatSidebarProps) {
  const formatSessionTitle = (session: SessionSummary) => {
    if (session.query_count > 0) {
      return `${session.query_count} query${session.query_count === 1 ? '' : 'ies'}`;
    }

    return 'New session';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 bg-zinc-950 border-r border-zinc-800 flex flex-col transition-all duration-300 z-40 ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-12'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800">
          {isOpen && <h1 className="text-lg font-bold text-zinc-100 pl-1">Chat</h1>}
          <button
            onClick={isOpen ? (onToggle ?? onClose) : onToggle}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {isOpen ? <X className="w-5 h-5 text-zinc-400" /> : <Menu className="w-5 h-5 text-zinc-400" />}
          </button>
        </div>

        {/* New Chat Button */}
        {isOpen && (
          <button
            onClick={onNewChat}
            className="mx-4 mt-4 mb-2 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        )}

        {/* Conversations */}
        <div className={`flex-1 overflow-y-auto ${isOpen ? 'p-4' : 'hidden'}`}>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase mb-3">
            Conversations
          </h2>
          <div className="space-y-2">
            {isSessionsLoading && (
              <p className="text-xs text-zinc-500 px-1">Loading sessions...</p>
            )}
            {!isSessionsLoading && sessions.length === 0 && (
              <p className="text-xs text-zinc-500 px-1">No sessions yet.</p>
            )}
            {sessions.map(session => {
              const isActive = session.session_id === activeSessionId;
              return (
                <button
                  key={session.session_id}
                  onClick={() => onSelectSession(session.session_id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors group ${
                    isActive ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                  }`}
                >
                  <p className="text-sm text-zinc-300 group-hover:text-zinc-100 truncate">
                    {formatSessionTitle(session)}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1 truncate">
                    {new Date(session.created_at).toLocaleDateString()} - {session.session_id.slice(0, 8)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {isOpen && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900">
            <p className="text-xs text-zinc-500 mb-2">Session Info</p>
            <div className="text-xs text-zinc-600 space-y-1">
              <p>ID: {activeSessionId.slice(0, 8)}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Menu Button */}
      {!isOpen && (
        <button
          onClick={() => {}}
          className="md:hidden fixed bottom-20 right-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
