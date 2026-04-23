import { useState, useCallback, useEffect } from 'react';
import type { Message, Document, ChatState, AnalysisResult, SessionHistoryItem, SessionSummary } from '@/lib/types';

const generateId = () => Math.random().toString(36).slice(2, 11);

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session-${generateId()}`;
};

function getConfidenceLevel(analysis?: AnalysisResult): 'high' | 'medium' | 'low' {
  if (!analysis) {
    return 'medium';
  }

  const domainConfidences = Object.values(analysis.domains).map(domain => domain.confidence);
  const averageConfidence = domainConfidences.length > 0
    ? domainConfidences.reduce((sum, value) => sum + value, 0) / domainConfidences.length
    : 0;

  if (averageConfidence >= 0.8) {
    return 'high';
  }

  if (averageConfidence >= 0.55) {
    return 'medium';
  }

  return 'low';
}

export function useChat() {
  const [sessionId, setSessionId] = useState(createSessionId);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    activeDocumentId: null,
    selectedDocuments: [],
    tokensUsed: 0,
  });

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, citations?: any[], confidenceLevel?: 'high' | 'medium' | 'low', analysis?: AnalysisResult) => {
    const message: Message = {
      id: generateId(),
      role,
      content,
      citations,
      timestamp: new Date(),
      confidenceLevel,
      analysis,
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));

    return message;
  }, []);

  const parseHistoryToMessages = useCallback((history: SessionHistoryItem[]): Message[] => {
    const sorted = [...history].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const messages: Message[] = [];

    sorted.forEach(item => {
      messages.push({
        id: generateId(),
        role: 'user',
        content: item.query,
        timestamp: new Date(item.timestamp),
      });

      const result = item.result;
      const hasStructuredResult = result && typeof result === 'object' && !!result.summary;

      if (hasStructuredResult) {
        const analysis = {
          query: typeof result.query === 'string' ? result.query : item.query,
          summary: typeof result.summary === 'string' ? result.summary : item.summary ?? '',
          top_opportunities: Array.isArray(result.top_opportunities) ? result.top_opportunities : [],
          top_risks: Array.isArray(result.top_risks) ? result.top_risks : [],
          recommended_actions: Array.isArray(result.recommended_actions) ? result.recommended_actions : [],
          low_confidence: Array.isArray(result.low_confidence) ? result.low_confidence : [],
          urls: Array.isArray(result.urls) ? result.urls : [],
          view: result.view === 'full' ? 'full' : 'summary',
          active_domains: Array.isArray(result.active_domains) ? result.active_domains : [],
          domains: result.domains && typeof result.domains === 'object' ? result.domains : {},
          citations: Array.isArray(result.citations) ? result.citations : [],
        } as AnalysisResult;

        messages.push({
          id: generateId(),
          role: 'assistant',
          content: analysis.summary || 'Analysis completed.',
          analysis,
          citations: analysis.citations,
          timestamp: new Date(item.timestamp),
          confidenceLevel: getConfidenceLevel(analysis),
        });
      } else if (item.summary) {
        messages.push({
          id: generateId(),
          role: 'assistant',
          content: item.summary,
          timestamp: new Date(item.timestamp),
          confidenceLevel: 'medium',
        });
      }
    });

    return messages;
  }, []);

  const refreshSessions = useCallback(async () => {
    setIsSessionsLoading(true);
    try {
      const response = await fetch('/api/sessions');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load sessions');
      }

      setSessions(Array.isArray(payload) ? payload : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sessions';
      setState(prev => ({ ...prev, error: message }));
    } finally {
      setIsSessionsLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (nextSessionId: string) => {
    setIsSessionsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(nextSessionId)}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load session history');
      }

      const history = Array.isArray(payload?.history) ? payload.history as SessionHistoryItem[] : [];
      const restoredMessages = parseHistoryToMessages(history);

      setSessionId(nextSessionId);
      setState(prev => ({
        ...prev,
        messages: restoredMessages,
        isLoading: false,
        error: undefined,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load session history';
      setState(prev => ({ ...prev, error: message }));
    } finally {
      setIsSessionsLoading(false);
    }
  }, [parseHistoryToMessages]);

  const startNewSession = useCallback(async () => {
    const generated = createSessionId();

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: generated }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to create session');
      }

      const nextSessionId = typeof payload?.session_id === 'string' ? payload.session_id : generated;
      setSessionId(nextSessionId);
      setState(prev => ({ ...prev, messages: [], error: undefined }));
      await refreshSessions();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create session';
      setSessionId(generated);
      setState(prev => ({ ...prev, messages: [], error: message }));
    }
  }, [refreshSessions]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const sendMessage = useCallback(async (userMessage: string) => {
    addMessage('user', userMessage);
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          documentIds: state.selectedDocuments.map(document => document.id),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Request failed');
      }

      const analysis = payload as AnalysisResult & {
        message?: string;
        usage?: {
          completionTokens?: number;
        };
      };

      addMessage(
        'assistant',
        analysis.message || analysis.summary || 'Analysis completed.',
        analysis.citations,
        getConfidenceLevel(analysis),
        analysis,
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        tokensUsed: prev.tokensUsed + (analysis.usage?.completionTokens ?? 0),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';

      addMessage('assistant', `Analysis failed: ${message}`, undefined, 'low');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [addMessage, sessionId, state.selectedDocuments]);

  const setSelectedDocuments = useCallback((documents: Document[]) => {
    setState(prev => ({ ...prev, selectedDocuments: documents }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
  }, []);

  return {
    ...state,
    sessionId,
    sessions,
    isSessionsLoading,
    sendMessage,
    addMessage,
    setSelectedDocuments,
    clearMessages,
    refreshSessions,
    loadSession,
    startNewSession,
  };
}
