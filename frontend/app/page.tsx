'use client';

import { useState, useEffect } from 'react';
import { ChatSidebar } from '@/components/chat-sidebar';
import { ChatMessages } from '@/components/chat-messages';
import { ChatInput } from '@/components/chat-input';
import { useChat } from '@/hooks/use-chat';
import { UserProfilePanel } from '@/components/user-profile-panel';
import { AGENTS } from '@/lib/agents';

export default function Home() {
  const chat = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(AGENTS.map(a => a.id));

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSendMessage = async (message: string) => {
    await chat.sendMessage(message);
  };

  const handleNewChat = () => {
    chat.startNewSession();
  };

  const handleSelectSession = async (sessionId: string) => {
    await chat.loadSession(sessionId);
  };

  const handleCloseSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 dark">
      {/* Sidebar */}
      <ChatSidebar
        sessions={chat.sessions}
        activeSessionId={chat.sessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        isSessionsLoading={chat.isSessionsLoading}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        onToggle={() => setSidebarOpen(o => !o)}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Persistent top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isMobile && !sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="mr-1 p-1.5 hover:bg-zinc-800 rounded transition-colors"
                aria-label="Open sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-zinc-400">
                  <line x1="2" y1="4" x2="14" y2="4" />
                  <line x1="2" y1="8" x2="14" y2="8" />
                  <line x1="2" y1="12" x2="14" y2="12" />
                </svg>
              </button>
            )}
            <h1 className="text-sm font-semibold text-zinc-100">Chat</h1>
          </div>
          <UserProfilePanel tokensUsed={chat.tokensUsed} />
        </div>

       
        <div className="flex-1 overflow-y-auto px-3">
  <div className="max-w-4xl mx-auto">
    <ChatMessages 
      messages={chat.messages} 
      isLoading={chat.isLoading} 
      selectedAgentIds={selectedAgentIds}
    />
  </div>
</div>

<div className="px-3 pb-4">
  <div className="max-w-4xl mx-auto">
    <ChatInput
      onSend={handleSendMessage}
      isLoading={chat.isLoading}
      selectedAgentIds={selectedAgentIds}
      onAgentsChange={setSelectedAgentIds}
    />
  </div>
</div>
      </main>
    </div>
  );
}
