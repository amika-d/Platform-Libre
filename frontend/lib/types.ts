export interface Citation {
  id?: string;
  documentName?: string;
  page?: number;
  section?: string;
  relevanceScore?: number;
  excerpt?: string;
  claim?: string;
  source?: string;
  url?: string;
}

export interface AnalysisDomain {
  findings: string[];
  confidence: number;
  key_insight: string;
}

export interface AnalysisResult {
  query: string;
  summary: string;
  top_opportunities: string[];
  top_risks: string[];
  recommended_actions: string[];
  low_confidence: string[];
  urls: string[];
  view: 'full' | 'summary';
  active_domains: string[];
  domains: Record<string, AnalysisDomain>;
  citations: Citation[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string; // This will store the summary or the full string if no analysis
  analysis?: AnalysisResult;
  citations?: Citation[];
  timestamp: Date;
  confidenceLevel?: 'high' | 'medium' | 'low';
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'markdown';
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  activeDocumentId: string | null;
  selectedDocuments: Document[];
  tokensUsed: number;
  error?: string;
}

export interface SessionSummary {
  session_id: string;
  created_at: string;
  query_count: number;
  total_cost: number;
  avg_duration_ms: number;
}

export interface SessionHistoryItem {
  query: string;
  timestamp: string;
  summary?: string;
  cost_usd?: number;
  duration_ms?: number;
  result?: Partial<AnalysisResult>;
}

export interface ApiResponse extends Partial<AnalysisResult> {
  message?: string;
  usage?: {
    completionTokens: number;
    latency: number;
    tokensPerSecond: number;
  };
  error?: string;
}
