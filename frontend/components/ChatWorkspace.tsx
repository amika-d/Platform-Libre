'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Square, Zap, Plus, Mic, Sparkles, FileText, Search, GitBranch, BarChart2 } from 'lucide-react'
import { Logo } from './Logo'
import StageBadge, { Stage } from './StageBadge'
import ABCard from './ABCard'
import BattleCard from './BattleCard'
import ClarifyCard from './ClarifyCard'
import IntelCard from './IntelCard'
import GapMapCard from './GapMapCard'
import ReachMapCard from './ReachMapCard'
import LinkedInPostCard from '@/components/LinkedInPostCard'
import FlyerCard, { type FlyerVariant } from '@/components/FlyerCard'
import LiveProspectQueue from './LiveProspectQueue'
import ProspectApprovalCard from './ProspectApprovalCard'
import StreamResponseCard, { extractStreamDisplayText } from './StreamResponseCard'
import { ThinkingBlock } from './ThinkingBlock'
import type { SidebarTab } from './ContextPanel'
import { HISTORY_RESEARCH_QUERY, HISTORY_RESEARCH_SOURCES } from '@/lib/historyResearch'
import { streamAnalyse, type AnalyseStreamChunk } from '@/lib/api'

type MessageRole = 'user' | 'agent'

interface BaseMessage {
  id: string
  role: MessageRole
  stage?: Stage
  timestamp: string
  sourceDetails?: Array<{ id: string; domain: string; url: string }>
  thinkingBlocks?: AnalyseStreamChunk[]
  thinking?: string
}

interface BattleCardMessage extends BaseMessage {
  type: 'battlecard'
  intro: string
  usLabel: string
  themLabel: string
  usPoints: string[]
  themPoints: string[]
  gapStatement: string
  keyDifferentiator: string
  signalReference?: string
}
interface TextMessage extends BaseMessage {
  type: 'text'
  content: string
}

interface ABMessage extends BaseMessage {
  type: 'ab'
  intro: string
  variantA: {
    label: string
    angle: string
    subject?: string
    hook: string
    cta: string
    score?: number
  }
  variantB: {
    label: string
    angle: string
    subject?: string
    hook: string
    cta: string
    score?: number
  }
}

interface ClarifyMessage extends BaseMessage {
  type: 'clarify'
  question: string
  options: { label: string; value: string }[]
}

interface IntelMessage extends BaseMessage {
  type: 'intel'
  intro: string
  title: string
  summary: string
  signals: any[]
  sources: number
}

interface GapZone {
  id: string
  label: string
  x: number
  y: number
  description: string
}

interface GapMapMessage extends BaseMessage {
  type: 'gapmap'
  intro: string
  title: string
  xLabel: string
  yLabel: string
  competitors: { name: string; x: number; y: number }[]
  gaps: GapZone[]
}

interface ReachMapMessage extends BaseMessage {
  type: 'reachmap'
  intro: string
  title: string
  channels: { id: string; label: string; replyRate: number; x: number; y: number; color: string }[]
}

interface LinkedInPostMessage extends BaseMessage {
  type: 'linkedinpost'
  intro: string
  title: string
  description: string
  imageSeed: number
  generatedPosts?: LinkedInGeneratedPost[]
}

interface ProspectQueueMessage extends BaseMessage {
  type: 'prospectqueue'
  intro: string
}

interface ProspectApprovalMessage extends BaseMessage {
  type: 'prospectapproval'
  intro: string
  pendingProspects: Array<{
    name: string
    email?: string
    company?: string
    linkedin_url?: string
  }>
}

interface FlyerMessage extends BaseMessage {
  type: 'flyer'
  intro: string
  title: string
  flyers: FlyerVariant[]
}

type Message = TextMessage | ABMessage | BattleCardMessage | ClarifyMessage | IntelMessage | GapMapMessage | ReachMapMessage | LinkedInPostMessage | ProspectQueueMessage | ProspectApprovalMessage | FlyerMessage

type EmailSequenceVariant = {
  id?: string
  angle?: string
  hypothesis?: string
  signal_reference?: string
  touch_1?: { subject?: string; body?: string; cta?: string }
  touch_2?: { subject?: string; body?: string; cta?: string }
  touch_3?: { subject?: string; body?: string; cta?: string }
}

type EmailSequenceAsset = {
  variants?: EmailSequenceVariant[]
}
type BattleCardAsset = {
  signal_reference?: string
  us_label?: string
  them_label?: string
  us_points?: string[]
  them_points?: string[]
  gap_statement?: string
  key_differentiator?: string
}

type LinkedInGeneratedPost = {
  id?: string
  angle?: string
  hook?: string
  body?: string
  cta?: string
  hashtags?: string[]
  image_url?: string
}

type LinkedInPostsAsset = {
  posts?: LinkedInGeneratedPost[]
}

type FlyersAsset = {
  flyers?: FlyerVariant[]
  title?: string
  intro?: string
}

const QUICK_PROMPTS = [
  'Generate posts',
  'Do market research',
  'Build outreach sequence',
  'Run A/B variants',
  'Generate battle card (demo)',
  'Analyze feedback signals',
]

const BATTLE_CARD_DEMO_LABEL = 'Generate battle card (demo)'
const BATTLE_CARD_DEMO_PROMPT =
  'generate_battle_card: Create a battle card comparing our product vs the primary competitor using current research and include gap_statement plus key_differentiator.'

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    type: 'text',
    content: "What's the current positioning gap in the AI SDR market?",
    timestamp: '09:42',
  },
  {
    id: '2',
    role: 'agent',
    type: 'intel',
    stage: 'research',
    intro: 'Scanning competitor messaging, job postings, and audience forums across 34 sources...',
    title: 'AI SDR Market: Significant Personalisation Gap Identified',
    summary:
      'The AI SDR market is converging on volume-first messaging — "10× your pipeline", "book more meetings automatically". Lilian\'s opportunity is authenticity at scale: personalised outreach grounded in real buyer signals, not spray-and-pray automation. VP Sales buyers are fatigued by generic AI SDRs.',
    signals: [
      { label: 'Competitor gap', sentiment: 'positive', detail: 'Apollo, Outreach, and Clay all lead with volume metrics. Zero messaging around reply quality or conversation depth.' },
      { label: 'Audience signal', sentiment: 'positive', detail: 'r/sales and LinkedIn: "AI SDRs feel robotic" — 3.2K engagements this week. Buyers want human-feeling outreach.' },
      { label: 'Pricing pressure', sentiment: 'negative', detail: 'Race-to-bottom on per-seat pricing emerging. Lilian should avoid competing here.' },
    ],
    sources: 34,
    timestamp: '09:42',
  },
  {
    id: '3',
    role: 'agent',
    type: 'gapmap',
    stage: 'research',
    intro: 'Mapped competitor positioning on Price vs Automation Level. Click an empty area to generate a segment-specific outreach sequence.',
    title: 'AI SDR Positioning Gap Map',
    xLabel: 'Price (low -> high)',
    yLabel: 'Automation Level (low -> high)',
    competitors: [
      { name: 'Apollo', x: 58, y: 74 },
      { name: 'Outreach', x: 81, y: 78 },
      { name: 'Clay', x: 69, y: 64 },
      { name: 'Lemlist', x: 46, y: 52 },
    ],
    gaps: [
      {
        id: 'high-auto-low-price',
        label: 'Gap A\nHigh Auto / Low Price',
        x: 20,
        y: 82,
        description: 'high-automation / low-price',
      },
      {
        id: 'mid-auto-mid-price',
        label: 'Gap B\nMid Auto / Mid Price',
        x: 38,
        y: 55,
        description: 'balanced automation / mid-price',
      },
    ],
    timestamp: '09:43',
  },
  {
    id: '4',
    role: 'user',
    type: 'text',
    content: 'Now write three outreach variants targeting VP Sales at Series B companies',
    timestamp: '09:44',
  },
  {
    id: '5',
    role: 'agent',
    type: 'ab',
    stage: 'ab',
    intro: "Generated two lead variants from the positioning gap signal. A leads with competitor contrast, B leads with buyer fatigue empathy.",
    variantA: {
      label: 'Variant A',
      angle: 'Competitor gap angle',
      subject: 'Your AI SDR is filling pipeline. Lilian fills conversations.',
      hook: "Most AI SDRs measure success in meetings booked. Lilian measures it in replies that actually go somewhere — because your VP Sales quota doesn't care about ghost meetings.",
      cta: "See Lilian's reply rate benchmarks",
      score: 18,
    },
    variantB: {
      label: 'Variant B',
      angle: 'Buyer empathy angle',
      subject: "You've probably ignored 3 AI SDR emails today.",
      hook: "So have your prospects. The problem isn't the volume — it's that they all sound the same. Lilian reads the room before she writes the email.",
      cta: 'Watch Lilian research a prospect live',
      score: 26,
    },
    timestamp: '09:44',
  },
  {
    id: '6',
    role: 'agent',
    type: 'clarify',
    stage: 'generate',
    question: 'Which channel should we deploy these on first?',
    options: [
      { label: 'LinkedIn', value: 'linkedin' },
      { label: 'Cold Email', value: 'email' },
      { label: 'Both simultaneously', value: 'both' },
    ],
    timestamp: '09:44',
  },
  {
    id: '7',
    role: 'agent',
    type: 'linkedinpost',
    stage: 'generate',
    intro: 'Drafted a LinkedIn post preview. You can edit the description, regenerate the image, or upload a custom image before publishing.',
    title: 'LinkedIn Post Draft: Signal-Aware Outreach Wins',
    description:
      'Most outreach fails because automation reads like automation. The next edge is signal-aware personalization that feels human, specific, and worth replying to.',
    imageSeed: 2,
    timestamp: '09:45',
  },
  {
    id: '8',
    role: 'agent',
    type: 'reachmap',
    stage: 'feedback',
    intro: 'Multi-channel reach map is ready. Bubble size tracks reply rate, so you can quickly reallocate effort to the strongest channel.',
    title: 'Campaign Attention Map: LinkedIn vs Email vs Twitter',
    channels: [
      { id: 'linkedin', label: 'LinkedIn', replyRate: 17, x: 67, y: 58, color: '#111111' },
      { id: 'email', label: 'Email', replyRate: 3, x: 30, y: 32, color: '#555555' },
      { id: 'twitter', label: 'Twitter', replyRate: 7, x: 78, y: 24, color: '#777777' },
    ],
    timestamp: '09:46',
  },
]

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '12px 0' }}>
      <Logo size={28} iconSize={18} background="#ffffff" />
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, alignItems: 'center' }}>
        <div className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)' }} />
        <div className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)' }} />
        <div className="typing-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

function EmptyLandingState({
  input,
  onInputChange,
  onSubmit,
  onQuickPrompt,
}: {
  input: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  onQuickPrompt: (prompt: string) => void
}) {
  const landingInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = landingInputRef.current
    if (!el) return

    const maxHeight = 170
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 52), maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [input])

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px 32px',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ width: 'min(780px, 100%)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '-0.02em' }}>
            Hi Chavi
          </p>
          <h1
            style={{
              fontSize: 'clamp(34px, 5vw, 56px)',
              lineHeight: 1.02,
              letterSpacing: '-0.05em',
              color: 'var(--text-primary)',
              fontWeight: 500,
              margin: 0,
              fontFamily: 'var(--font-display)',
            }}
          >
            Where should we start?
          </h1>
        </div>

        <div
          style={{
            borderRadius: 32,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.08)',
            padding: '18px 20px 16px',
            marginBottom: 24,
          }}
        >
          <textarea
            ref={landingInputRef}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit()
              }
            }}
            placeholder="Ask Veracity"
            rows={1}
            style={{
              width: '100%',
              minHeight: 52,
              maxHeight: 170,
              resize: 'none',
              overflowY: 'hidden',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 16,
              lineHeight: 1.5,
              fontFamily: 'var(--font-sans)',
              caretColor: 'var(--text-primary)',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 18,
              color: '#d9d9d9',
            }}
          >
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Plus size={18} strokeWidth={2} />
            </button>

            <button
              type="button"
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={onSubmit}
            >
              <Mic size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {QUICK_PROMPTS.map(prompt => {
            const Icon =
              prompt === 'Generate posts'
                ? FileText
                : prompt === 'Do market research'
                  ? Search
                  : prompt === 'Build outreach sequence'
                    ? Sparkles
                    : prompt === 'Run A/B variants'
                      ? GitBranch
                      : prompt === 'Analyze feedback signals'
                        ? BarChart2
                        : Sparkles

            return (
              <button
                key={prompt}
                type="button"
                onClick={() => onQuickPrompt(prompt)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  padding: '13px 18px',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
                }}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{prompt}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  msg,
  selectedGapId,
  onSelectGap,
  contentChannelId,
  onMoveContent,
  isStreaming,
  onDeployVariant,
  sessionThreadId,
}: {
  msg: Message
  selectedGapId: string | null
  onSelectGap: (gap: GapZone) => void
  contentChannelId: string
  onMoveContent: (fromChannelId: string, toChannelId: string) => void
  isStreaming: boolean
  onDeployVariant: (variant: 'A' | 'B', variantLabel: string) => void
  sessionThreadId: string
}) {
  const isUser = msg.role === 'user'

  if (isUser && msg.type === 'text') {
    const textMsg = msg as TextMessage
    return (
      <div className="msg-in" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div
          style={{
            maxWidth: '70%',
            padding: '10px 14px',
            borderRadius: '10px 10px 2px 10px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            fontSize: 13,
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}
        >
          {textMsg.content}
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
            {textMsg.timestamp}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="msg-in" style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start' }}>
      <div style={{ marginTop: 2 }}>
        <Logo size={28} iconSize={18} background="#ffffff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Stage badge */}
        {msg.stage && msg.stage !== 'idle' && (
          <StageBadge stage={msg.stage} pulse={false} />
        )}

        {/* Content */}
        {msg.thinkingBlocks && msg.thinkingBlocks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {msg.thinkingBlocks.map((block, idx) => (
              <ThinkingBlock key={idx} chunk={block} isStreaming={isStreaming} />
            ))}
          </div>
        )}

        {msg.thinking && (
          <div style={{ marginBottom: 12 }}>
            <StreamResponseCard text={msg.thinking} isStreaming={isStreaming} isThinking={true} />
          </div>
        )}

        {msg.type === 'text' && (
          <>
            <StreamResponseCard text={msg.content} isStreaming={isStreaming} sourceDetails={msg.sourceDetails} />
          </>
        )}

        {msg.type === 'intel' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            <IntelCard
              title={msg.title}
              summary={msg.summary}
              signals={msg.signals}
              sources={msg.sources}
              sourceDetails={msg.sourceDetails}
              isStreaming={isStreaming}
            />
          </>
        )}

        {msg.type === 'ab' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            <ABCard
              variantA={msg.variantA}
              variantB={msg.variantB}
              onDeploy={variant => onDeployVariant(variant, variant === 'A' ? msg.variantA.label : msg.variantB.label)}
              isStreaming={isStreaming}
            />
          </>
        )}

        {msg.type === 'battlecard' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            <BattleCard
              usLabel={msg.usLabel}
              themLabel={msg.themLabel}
              usPoints={msg.usPoints}
              themPoints={msg.themPoints}
              gapStatement={msg.gapStatement}
              keyDifferentiator={msg.keyDifferentiator}
              signalReference={msg.signalReference}
              isStreaming={isStreaming}
            />
          </>
        )}

        {msg.type === 'gapmap' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            {Array.isArray(msg.competitors) && msg.competitors.length > 0 && (
              <GapMapCard
                title={msg.title}
                xLabel={msg.xLabel}
                yLabel={msg.yLabel}
                competitors={msg.competitors}
                gaps={msg.gaps}
                selectedGapId={selectedGapId}
                onSelectGap={onSelectGap}
                isStreaming={isStreaming}
              />
            )}
          </>
        )}

        {msg.type === 'reachmap' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            <ReachMapCard
              title={msg.title}
              channels={msg.channels}
              contentChannelId={contentChannelId}
              onMoveContent={onMoveContent}
              isStreaming={isStreaming}
            />
          </>
        )}

        {msg.type === 'linkedinpost' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            <LinkedInPostCard
              title={msg.title}
              initialDescription={msg.description}
              initialSeed={msg.imageSeed}
              isStreaming={isStreaming}
              generatedPosts={msg.generatedPosts}
            />
          </>
        )}

        {msg.type === 'clarify' && (
          <ClarifyCard
            question={msg.question}
            options={msg.options}
          />
        )}

        {msg.type === 'prospectqueue' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            <LiveProspectQueue sessionId={sessionThreadId} />
          </>
        )}

        {msg.type === 'prospectapproval' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            {Array.isArray(msg.pendingProspects) && msg.pendingProspects.length > 0 && (
              <ProspectApprovalCard
                threadId={sessionThreadId}
                initialPending={msg.pendingProspects}
              />
            )}
          </>
        )}

        {msg.type === 'flyer' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <StreamResponseCard text={msg.intro} isStreaming={isStreaming} />
            </div>
            {Array.isArray(msg.flyers) && msg.flyers.length > 0 && (
              <FlyerCard
                title={msg.title}
                intro={msg.intro}
                flyers={msg.flyers}
                isStreaming={isStreaming}
              />
            )}
          </>
        )}

        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
          {msg.timestamp}
        </p>
      </div>
    </div>
  )
}

interface ChatWorkspaceProps {
  activeTab: SidebarTab
  workspaceSessionId: number
  sessionThreadId: string
  showNewChatLanding: boolean
  selectedHistorySourceId: string
  onHistorySourceSelect: (sourceId: string) => void
  onSessionActivity?: (activity: {
    threadId: string
    title: string
    subtitle: string
    stage: 'research' | 'generate' | 'ab' | 'feedback'
    timestamp: string
  }) => void
}

function PerplexityResearchDemo({
  selectedHistorySourceId,
  onHistorySourceSelect,
}: {
  selectedHistorySourceId: string
  onHistorySourceSelect: (sourceId: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="msg-in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            maxWidth: '74%',
            padding: '10px 14px',
            borderRadius: '10px 10px 2px 10px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            fontSize: 13,
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}
        >
          {HISTORY_RESEARCH_QUERY}
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
            09:42
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ marginTop: 2 }}>
          <Logo size={28} iconSize={18} background="#ffffff" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <StageBadge stage="research" pulse={false} />
          <div style={{ borderRadius: 12, border: '1px solid var(--border-bright)', background: 'var(--bg-card)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--signal)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Perplexity-Style Research Response
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                4 sources analyzed
              </p>
            </div>

            <div style={{ padding: '14px' }}>
              <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.4, marginBottom: 10 }}>
                The biggest open gap is high-trust personalization at scale, not more automation volume.
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
                Leading AI SDR products still anchor their narrative to sends, sequences, and booked-meeting volume. Across operator communities and buyer-trend reports,
                VP Sales teams are asking for signal-aware outreach that sounds human, references real account context, and avoids commodity automation patterns.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {[
                  'Category leaders cluster on automation breadth, leaving personalization quality under-positioned.',
                  'Mid-market buyers respond better when first-touch messages cite concrete trigger events.',
                  'Pricing compression is increasing in seat-based automation tiers, reducing defensibility.',
                ].map(point => (
                  <p key={point} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    • {point}
                  </p>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Sources
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {HISTORY_RESEARCH_SOURCES.map((source, index) => {
                    const isSelected = selectedHistorySourceId === source.id
                    return (
                      <button
                        key={source.id}
                        onClick={() => onHistorySourceSelect(source.id)}
                        style={{
                          borderRadius: 999,
                          border: isSelected ? '1px solid var(--signal)' : '1px solid var(--border-bright)',
                          background: isSelected ? 'var(--signal-glow)' : 'var(--bg-elevated)',
                          color: isSelected ? 'var(--signal)' : 'var(--text-secondary)',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          padding: '5px 10px',
                          cursor: 'pointer',
                        }}
                        title={`Show ${source.domain} in right sidebar`}
                      >
                        [{index + 1}] {source.domain}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
            09:42
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyWorkspaceState({
  activeTab,
  selectedGapId,
  onSelectGap,
  contentChannelId,
  onMoveContent,
  selectedHistorySourceId,
  onHistorySourceSelect,
  sessionThreadId,
}: {
  activeTab: SidebarTab
  selectedGapId: string | null
  onSelectGap: (gap: GapZone) => void
  contentChannelId: string
  onMoveContent: (fromChannelId: string, toChannelId: string) => void
  selectedHistorySourceId: string
  onHistorySourceSelect: (sourceId: string) => void
  sessionThreadId: string
}) {
  const tabWorkspaceStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '100%',
    padding: '24px 24px 32px',
    boxSizing: 'border-box',
  }

  if (activeTab === 'intelligence') {
    return (
      <div style={tabWorkspaceStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <IntelCard
            title="AI SDR Market: Significant Personalisation Gap Identified"
            summary="The AI SDR market is converging on volume-first messaging. The opening here is authenticity at scale: personalised outreach grounded in real buyer signals, not spray-and-pray automation."
            signals={[
              { label: 'Competitor gap', sentiment: 'positive', detail: 'Apollo, Outreach, and Clay all lead with volume metrics. Zero messaging around reply quality or conversation depth.' },
              { label: 'Audience signal', sentiment: 'positive', detail: 'r/sales and LinkedIn: "AI SDRs feel robotic" - buyers want human-feeling outreach.' },
              { label: 'Pricing pressure', sentiment: 'negative', detail: 'Race-to-bottom on per-seat pricing is emerging. Avoid competing here.' },
            ]}
            sources={34}
            sourceDetails={[
              { id: 'src-1', domain: 'g2.com', url: 'https://g2.com' },
              { id: 'src-2', domain: 'linkedin.com', url: 'https://linkedin.com' },
              { id: 'src-3', domain: 'revgenius.com', url: 'https://revgenius.com' },
              { id: 'src-4', domain: 'cbinsights.com', url: 'https://cbinsights.com' },
            ]}
          />

          <GapMapCard
            title="AI SDR Positioning Gap Map"
            xLabel="Price (low -> high)"
            yLabel="Automation Level (low -> high)"
            competitors={[
              { name: 'Apollo', x: 58, y: 74 },
              { name: 'Outreach', x: 81, y: 78 },
              { name: 'Clay', x: 69, y: 64 },
              { name: 'Lemlist', x: 46, y: 52 },
            ]}
            gaps={[
              { id: 'high-auto-low-price', label: 'Gap A\nHigh Auto / Low Price', x: 20, y: 82, description: 'high-automation / low-price' },
              { id: 'mid-auto-mid-price', label: 'Gap B\nMid Auto / Mid Price', x: 38, y: 55, description: 'balanced automation / mid-price' },
            ]}
            selectedGapId={selectedGapId}
            onSelectGap={onSelectGap}
          />
        </div>
      </div>
    )
  }

  if (activeTab === 'outreach') {
    return (
      <div style={tabWorkspaceStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <LiveProspectQueue sessionId={sessionThreadId} />
        </div>
      </div>
    )
  }

  if (activeTab === 'content') {
    return (
      <div style={tabWorkspaceStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <LinkedInPostCard
            title="LinkedIn Post Draft: Signal-Aware Outreach Wins"
            initialDescription="Most outreach fails because automation reads like automation. The next edge is signal-aware personalization that feels human, specific, and worth replying to."
            initialSeed={2}
          />
        </div>
      </div>
    )
  }

  if (activeTab === 'signals') {
    return (
      <div style={tabWorkspaceStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ReachMapCard
            title="Campaign Attention Map: LinkedIn vs Email vs Twitter"
            channels={[
              { id: 'linkedin', label: 'LinkedIn', replyRate: 17, x: 67, y: 58, color: '#111111' },
              { id: 'email', label: 'Email', replyRate: 3, x: 30, y: 32, color: '#555555' },
              { id: 'twitter', label: 'Twitter', replyRate: 7, x: 78, y: 24, color: '#777777' },
            ]}
            contentChannelId={contentChannelId}
            onMoveContent={onMoveContent}
          />
        </div>
      </div>
    )
  }

  if (activeTab === 'ab') {
    return (
      <div style={tabWorkspaceStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ABCard
            variantA={{
              label: 'Variant A',
              angle: 'Competitor gap angle',
              subject: 'Your AI SDR is filling pipeline. Lilian fills conversations.',
              hook: "Most AI SDRs measure success in meetings booked. Lilian measures it in replies that actually go somewhere - because your VP Sales quota doesn't care about ghost meetings.",
              cta: "See Lilian's reply rate benchmarks",
              score: 18,
            }}
            variantB={{
              label: 'Variant B',
              angle: 'Buyer empathy angle',
              subject: "You've probably ignored 3 AI SDR emails today.",
              hook: "So have your prospects. The problem isn't the volume - it's that they all sound the same. Lilian reads the room before she writes the email.",
              cta: 'Watch Lilian research a prospect live',
              score: 26,
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={tabWorkspaceStyle}>
      <PerplexityResearchDemo selectedHistorySourceId={selectedHistorySourceId} onHistorySourceSelect={onHistorySourceSelect} />
    </div>
  )
}

export default function ChatWorkspace({
  activeTab,
  workspaceSessionId,
  sessionThreadId,
  showNewChatLanding,
  selectedHistorySourceId,
  onHistorySourceSelect,
  onSessionActivity,
}: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null)
  const [contentChannelId, setContentChannelId] = useState('email')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const hydratedSessionRef = useRef<string>('')

  const storageKey = `veracity-chat-session:${sessionThreadId}`

  const resolveStage = (action?: string): Stage | undefined => {
    if (!action) return undefined
    const lower = action.toLowerCase()
    if (lower.includes('research') || lower.includes('scan') || lower.includes('intel')) return 'research'
    if (lower.includes('ab') || lower.includes('variant')) return 'ab'
    if (lower.includes('feedback') || lower.includes('signal')) return 'feedback'
    if (lower.includes('refine')) return 'refined'
    if (lower.includes('generate') || lower.includes('draft') || lower.includes('write') || lower.includes('create')) return 'generate'
    return undefined
  }

  const extractBalancedJsonObject = (input: string): string | null => {
    const start = input.indexOf('{')
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < input.length; i += 1) {
      const char = input[i]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }

      if (char === '"') {
        inString = true
        continue
      }

      if (char === '{') depth += 1
      if (char === '}') {
        depth -= 1
        if (depth === 0) {
          return input.slice(start, i + 1)
        }
      }
    }

    return null
  }

  const parseDraftedAssetFromText = <T,>(rawText: string | undefined, assetKey: string): T | null => {
    if (!rawText) return null
    const markerMatch = rawText.match(new RegExp(`\\[Drafted:\\s*${assetKey}\\]`, 'i'))
    if (!markerMatch) return null

    const afterMarker = rawText.slice(markerMatch.index ?? 0)
    const jsonCandidate = extractBalancedJsonObject(afterMarker)
    if (!jsonCandidate) return null

    try {
      return JSON.parse(jsonCandidate) as T
    } catch {
      return null
    }
  }

  const parseEmailSequenceFromText = (rawText?: string): EmailSequenceAsset | null => {
    const parsedEmail = parseDraftedAssetFromText<EmailSequenceAsset>(rawText, 'email_sequence')
    if (parsedEmail && Array.isArray(parsedEmail.variants) && parsedEmail.variants.length > 0) return parsedEmail

    const parsedLiMessages = parseDraftedAssetFromText<EmailSequenceAsset>(rawText, 'linkedin_messages')
    if (parsedLiMessages && Array.isArray(parsedLiMessages.variants) && parsedLiMessages.variants.length > 0) return parsedLiMessages

    const parsedLiMessage = parseDraftedAssetFromText<EmailSequenceAsset>(rawText, 'linkedin_message')
    if (parsedLiMessage && Array.isArray(parsedLiMessage.variants) && parsedLiMessage.variants.length > 0) return parsedLiMessage

    return null
  }

  const parseBattleCardFromText = (rawText?: string): BattleCardAsset | null => {
    const parsed = parseDraftedAssetFromText<BattleCardAsset>(rawText, 'battle_card')
    if (!parsed) return null
    if (!parsed.us_label || !parsed.them_label) return null
    return parsed
  }

  const stripDraftedPayloadFromText = (rawText: string): string => {
    const markerMatch = rawText.match(/\[Drafted:\s*[a-z_]+\]/i)
    if (!markerMatch || markerMatch.index === undefined) return rawText
    return rawText.slice(0, markerMatch.index).trim()
  }

  const sanitizeAgentDisplayText = (rawText: string): string => {
    return rawText
      .replace(/--- DEBUG:[\s\S]*?---------------------------------------/gi, '')
      .replace(/(^|\n)\s*\[base_agent\].*/gi, '$1')
      .replace(/(^|\n)\s*→\s*\[[^\]]+\].*/gi, '$1')
      .replace(/\*\*THINK FIRST:\*\*[\s\S]*?(?=\n\s*\*\*Email Sequence Generated Successfully!\*\*|\n\s*🤖\s*Agent:|$)/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const isEmailSequenceResponseChunk = (chunk: AnalyseStreamChunk): boolean => {
    const asset = chunk.asset as Record<string, unknown> | undefined
    const action = (chunk.action || '').toLowerCase()
    const node = (chunk.node || '').toLowerCase()
    const text = chunk.text || ''

    const hasLiMsgAsset = asset?.linkedin_messages || asset?.linkedin_message;
    const hasLiMsgText = /\[Drafted:\s*linkedin_messages?\]/i.test(text);

    // Ignore stale email sequence assets attached to generic chat turns.
    if (!asset?.email_sequence && !/\[Drafted:\s*email_sequence\]/i.test(text) && !hasLiMsgAsset && !hasLiMsgText) return false
    if (/\[Drafted:\s*email_sequence\]/i.test(text) || hasLiMsgText) return true
    if (action.includes('generate_email_sequence') || action.includes('email_sequence') || action.includes('linkedin_message')) return true
    if (node.includes('generate_email_sequence') || node.includes('email_sequence') || node.includes('linkedin_message')) return true

    return false
  }

  const isBattleCardResponseChunk = (chunk: AnalyseStreamChunk): boolean => {
    const asset = chunk.asset as Record<string, unknown> | undefined
    const action = (chunk.action || '').toLowerCase()
    const node = (chunk.node || '').toLowerCase()
    const text = chunk.text || ''

    // Ignore stale battle card assets attached to generic chat turns.
    if (!asset?.battle_card) return false
    if (/\[Drafted:\s*battle_card\]/i.test(text)) return true
    if (action.includes('generate_battle_card') || action.includes('battle_card')) return true
    if (node.includes('generate_battle_card')) return true

    return false
  }

  const isLinkedInPostResponseChunk = (chunk: AnalyseStreamChunk): boolean => {
    const asset = chunk.asset as Record<string, unknown> | undefined
    const action = (chunk.action || '').toLowerCase()
    const node = (chunk.node || '').toLowerCase()
    const text = (chunk.text || '').toLowerCase()

    // Ignore stale linkedin assets attached to generic chat turns.
    if (!asset?.linkedin_posts && !text.includes('[drafted: linkedin_post')) return false
    if (action.includes('generate_linkedin_post') || action.includes('linkedin_post') || action.includes('linkedin_posts')) return true
    if (node.includes('generate_linkedin_post') || node.includes('linkedin_post') || node.includes('linkedin_posts')) return true
    if (text.includes('[drafted: linkedin_post')) return true

    return false
  }

  const isFlyerResponseChunk = (chunk: AnalyseStreamChunk): boolean => {
    const asset = chunk.asset as Record<string, unknown> | undefined
    const action = (chunk.action || '').toLowerCase()
    const node = (chunk.node || '').toLowerCase()
    const text = (chunk.text || '').toLowerCase()

    // Ignore stale flyer assets attached to generic chat turns.
    if (!asset?.flyers && !asset?.flyer) return false
    if (action.includes('flyer') || action.includes('generate_flyer')) return true
    if (node.includes('flyer') || node.includes('generate_flyer')) return true
    if (text.includes('[drafted: flyer') || text.includes('[drafted: flyers')) return true

    return false
  }

  const isProspectApprovalChunk = (chunk: AnalyseStreamChunk): boolean => {
    const action = (chunk.action || '').toLowerCase()
    const node = (chunk.node || '').toLowerCase()
    const text = (chunk.text || '').toLowerCase()

    if (action.includes('wait_for_prospect_approval') || action.includes('approve_prospects')) return true
    if (node.includes('wait_for_prospect_approval') || node.includes('approve_prospects') || node.includes('show_prospects')) return true

    return (
      text.includes('review and approve') ||
      text.includes('approve prospects') ||
      text.includes('approved prospects')
    )
  }

  const isCompetitiveMapChunk = (chunk: AnalyseStreamChunk): boolean => {
    const asset = chunk.asset as Record<string, unknown> | undefined
    const action = (chunk.action || '').toLowerCase()
    const node = (chunk.node || '').toLowerCase()

    // Ignore stale map assets attached to generic chat turns.
    if (!asset?.competitive_map) return false
    if (action.includes('competitive_map') || action.includes('competitivemap')) return true
    if (node.includes('competitive_map') || node.includes('competitivemap')) return true

    return false
  }

  const parseFlyersFromText = (rawText?: string): FlyersAsset | null => {
    const flyers = parseDraftedAssetFromText<FlyersAsset>(rawText, 'flyers')
    if (flyers?.flyers?.length) return flyers

    const singleFlyers = parseDraftedAssetFromText<FlyersAsset>(rawText, 'flyer')
    if (singleFlyers?.flyers?.length) return singleFlyers

    const singleFlyer = parseDraftedAssetFromText<FlyerVariant>(rawText, 'flyer')
    if (singleFlyer) return { flyers: [singleFlyer] }

    return null
  }

  const parseLinkedInPostsFromText = (rawText?: string): LinkedInPostsAsset | null => {
    const postsAsset = parseDraftedAssetFromText<LinkedInPostsAsset>(rawText, 'linkedin_posts')
    if (postsAsset?.posts?.length) return postsAsset

    const singlePostAsset = parseDraftedAssetFromText<LinkedInPostsAsset>(rawText, 'linkedin_post')
    if (singlePostAsset?.posts?.length) return singlePostAsset

    const postsArray = parseDraftedAssetFromText<LinkedInGeneratedPost[]>(rawText, 'linkedin_posts')
    if (Array.isArray(postsArray) && postsArray.length > 0) return { posts: postsArray }

    return null
  }

  const buildLinkedInPostMessage = (chunk: AnalyseStreamChunk, streamMessageId: string): LinkedInPostMessage | null => {
    if (!isLinkedInPostResponseChunk(chunk)) return null

    const asset = chunk.asset as Record<string, unknown> | undefined
    const linkedinAsset = asset?.linkedin_posts as LinkedInPostsAsset | undefined
    const fromText = parseLinkedInPostsFromText(chunk.text)

    const posts = (linkedinAsset?.posts || fromText?.posts || []).filter(
      post => Boolean(post) && Boolean((post.hook || '').trim() || (post.body || '').trim())
    )

    if (posts.length === 0) return null

    const firstPost = posts[0]
    const firstDescription = [firstPost.hook, firstPost.body, firstPost.cta]
      .filter(Boolean)
      .join('\n\n')
      .trim()

    const introText = extractStreamDisplayText(stripDraftedPayloadFromText(chunk.text || ''))
    const title = firstPost.angle?.trim() || 'LinkedIn Post Draft'

    return {
      id: streamMessageId,
      role: 'agent',
      type: 'linkedinpost',
      stage: resolveStage(chunk.action) ?? 'generate',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intro: introText || `Generated ${posts.length} LinkedIn post${posts.length === 1 ? '' : 's'} from the current research signal.`,
      title,
      description: firstDescription || 'LinkedIn draft generated from research signals.',
      imageSeed: 2,
      generatedPosts: posts,
    }
  }

  const buildFlyerMessage = (chunk: AnalyseStreamChunk, streamMessageId: string): FlyerMessage | null => {
    if (!isFlyerResponseChunk(chunk)) return null

    const asset = chunk.asset as Record<string, unknown> | undefined
    const flyersAsset = asset?.flyers as FlyersAsset | undefined
    const flyerAsset = asset?.flyer as FlyerVariant | FlyersAsset | undefined
    const fromText = parseFlyersFromText(chunk.text)

    const flyerList = [
      ...(flyersAsset?.flyers || []),
      ...(Array.isArray((flyerAsset as FlyersAsset | undefined)?.flyers)
        ? ((flyerAsset as FlyersAsset).flyers || [])
        : []),
      ...((flyerAsset && !Array.isArray((flyerAsset as FlyersAsset).flyers) && (flyerAsset as FlyerVariant).headline)
        ? [flyerAsset as FlyerVariant]
        : []),
      ...(fromText?.flyers || []),
    ].filter(Boolean)

    if (flyerList.length === 0) return null

    const introText = extractStreamDisplayText(stripDraftedPayloadFromText(chunk.text || ''))
    const derivedTitle =
      flyersAsset?.title ||
      (flyerAsset as FlyersAsset | undefined)?.title ||
      fromText?.title ||
      flyerList[0]?.title ||
      'Campaign Flyer'

    return {
      id: streamMessageId,
      role: 'agent',
      type: 'flyer',
      stage: resolveStage(chunk.action) ?? 'generate',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intro: introText || flyersAsset?.intro || fromText?.intro || `Generated ${flyerList.length} flyer variant${flyerList.length > 1 ? 's' : ''}.`,
      title: derivedTitle,
      flyers: flyerList,
    }
  }

  const buildProspectApprovalMessage = (chunk: AnalyseStreamChunk, streamMessageId: string): ProspectApprovalMessage | null => {
    if (!isProspectApprovalChunk(chunk)) return null

    const introText = extractStreamDisplayText(stripDraftedPayloadFromText(chunk.text || ''))

    // Extract pending prospects from asset
    const asset = chunk.asset as Record<string, unknown> | undefined
    const pendingRaw = asset?.pending_prospects as Array<{
      name: string
      email?: string
      company?: string
      linkedin_url?: string
    }> | undefined

    const pendingProspects = (pendingRaw || []).filter(item =>
      Boolean(item && typeof item === 'object' && (item.name || item.email || item.linkedin_url))
    )

    if (pendingProspects.length === 0) return null

    return {
      id: streamMessageId,
      role: 'agent',
      type: 'prospectapproval',
      stage: resolveStage(chunk.action) ?? 'feedback',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intro: introText || 'Review pending prospects and approve the ones you want to include in outreach.',
      pendingProspects,
    }
  }

  const buildCompetitiveMapMessage = (chunk: AnalyseStreamChunk, streamMessageId: string): GapMapMessage | null => {
    if (!isCompetitiveMapChunk(chunk)) return null

    const asset = chunk.asset as Record<string, unknown> | undefined
    const mapData = asset?.competitive_map as Record<string, any> | undefined

    if (!mapData || typeof mapData !== 'object') return null

    const rawCompetitors = Array.isArray(mapData.competitors) ? mapData.competitors : []
    if (rawCompetitors.length === 0) return null

    // Scale x/y from 0-1 range to 0-100 range for chart
    const competitors = rawCompetitors.map((comp: any) => ({
      name: comp.label || comp.name || 'Unnamed Competitor',
      x: Math.round(Number(comp.x ?? 0.5) * 100),
      y: Math.round(Number(comp.y ?? 0.5) * 100),
    })).filter((comp: { name: string; x: number; y: number }) => Number.isFinite(comp.x) && Number.isFinite(comp.y))

    if (competitors.length === 0) return null

    // Generate intelligent gap zones based on competitor positions
    const gaps: GapZone[] = []

    // Add your position as primary marker
    if (mapData.your_position) {
      gaps.push({
        id: 'your-position',
        label: mapData.your_position.label || 'Your Position',
        x: Math.round(Number(mapData.your_position.x ?? 0.85) * 100),
        y: Math.round(Number(mapData.your_position.y ?? 0.75) * 100),
        description: 'Your unique positioning in the competitive landscape',
      })
    }

    // Generate opportunity gaps in underserved quadrants
    const competitorXValues: number[] = competitors.map((c: any) => c.x)
    const competitorYValues: number[] = competitors.map((c: any) => c.y)
    const avgX = competitorXValues.length > 0 ? competitorXValues.reduce((a: number, b: number) => a + b, 0) / competitorXValues.length : 50
    const avgY = competitorYValues.length > 0 ? competitorYValues.reduce((a: number, b: number) => a + b, 0) / competitorYValues.length : 50

    // Add gap opportunities in underserved areas
    const gapOpportunities = [
      { label: 'High Value\nLow Coverage', x: avgX + 25, y: avgY + 30, id: 'gap-premium' },
      { label: 'Emerging\nTechnology', x: avgX - 30, y: avgY + 35, id: 'gap-tech' },
      { label: 'Budget\nFriendly', x: avgX - 35, y: avgY - 25, id: 'gap-budget' },
    ]

    for (const gap of gapOpportunities) {
      if (gap.x >= 0 && gap.x <= 100 && gap.y >= 0 && gap.y <= 100) {
        gaps.push({
          id: gap.id,
          label: gap.label,
          x: Math.round(Math.min(100, Math.max(0, gap.x))),
          y: Math.round(Math.min(100, Math.max(0, gap.y))),
          description: `Messaging gap: ${gap.label.replace(/\n/g, ' ')} positioning opportunity`,
        })
      }
    }

    const introText = extractStreamDisplayText(stripDraftedPayloadFromText(chunk.text || ''))

    return {
      id: streamMessageId,
      role: 'agent',
      type: 'gapmap',
      stage: resolveStage(chunk.action) ?? 'research',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intro: introText || 'Competitive positioning analysis based on research intelligence.',
      title: 'Competitive Intelligence Map',
      xLabel: 'Market Coverage →',
      yLabel: 'Product Maturity →',
      competitors,
      gaps,
    }
  }
  const isValidVariant = (variant: any): boolean => {
    // Check if variant has meaningful data
    const hasAngle = Boolean(variant.angle || variant.hypothesis)
    const hasBody = Boolean(variant.touch_1?.body || variant.body || variant.signal_reference)
    const hasCta = Boolean(variant.touch_1?.cta || variant.cta)

    // At least 2 of these should be present
    return [hasAngle, hasBody, hasCta].filter(Boolean).length >= 2
  }

  const normalizeEmailVariant = (variant: any, fallbackLabel: 'A' | 'B') => {
    const label = variant.id || fallbackLabel
    const firstTouch = variant.touch_1 || {}

    return {
      label: `Variant ${label}`,
      angle: variant.angle || variant.hypothesis || 'Outreach variant',
      subject: firstTouch.subject || variant.subject || undefined,
      hook: firstTouch.body || variant.body || variant.signal_reference || 'Generated outreach variant',
      cta: firstTouch.cta || variant.cta || 'Review sequence',
      score: undefined,
    }
  }

  const buildEmailSequenceMessage = (chunk: AnalyseStreamChunk, streamMessageId: string): ABMessage | null => {
    const asset = chunk.asset as Record<string, unknown> | undefined
    const emailSequenceFromAsset = (asset?.email_sequence || asset?.linkedin_messages || asset?.linkedin_message) as EmailSequenceAsset | undefined
    const emailSequenceFromText = parseEmailSequenceFromText(chunk.text)
    const emailSequence = emailSequenceFromAsset || emailSequenceFromText
    const variants = emailSequence?.variants || []

    if (variants.length === 0) return null

    // Prevent stale cards from rendering on unrelated conversational turns.
    if (!isEmailSequenceResponseChunk(chunk)) return null

    // Only create AB card if variants have meaningful data
    if (!isValidVariant(variants[0]) || !isValidVariant(variants[1] || variants[0])) {
      return null
    }

    const first = normalizeEmailVariant(variants[0], 'A')
    const second = normalizeEmailVariant(variants[1] || variants[0], 'B')

    return {
      id: streamMessageId,
      role: 'agent',
      type: 'ab',
      stage: resolveStage(chunk.action) ?? 'generate',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intro: extractStreamDisplayText(stripDraftedPayloadFromText(chunk.text || '')) || 'Generated an email sequence with A/B variants.',
      variantA: first,
      variantB: second,
    }
  }

  const buildBattleCardMessage = (chunk: AnalyseStreamChunk, streamMessageId: string): BattleCardMessage | null => {
    const asset = chunk.asset as Record<string, unknown> | undefined
    const battleCardFromAsset = asset?.battle_card as BattleCardAsset | undefined
    const battleCardFromText = parseBattleCardFromText(chunk.text)
    const battleCard = battleCardFromAsset || battleCardFromText

    if (!battleCard) return null
    if (!isBattleCardResponseChunk(chunk)) return null

    const usPoints = Array.isArray(battleCard.us_points) ? battleCard.us_points.filter(Boolean) : []
    const themPoints = Array.isArray(battleCard.them_points) ? battleCard.them_points.filter(Boolean) : []

    if (!battleCard.us_label || !battleCard.them_label) return null
    if (!battleCard.gap_statement || !battleCard.key_differentiator) return null
    if (usPoints.length === 0 || themPoints.length === 0) return null

    return {
      id: streamMessageId,
      role: 'agent',
      type: 'battlecard',
      stage: resolveStage(chunk.action) ?? 'generate',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intro: extractStreamDisplayText(stripDraftedPayloadFromText(chunk.text || '')) || 'Generated a battle card from current market signals.',
      usLabel: battleCard.us_label,
      themLabel: battleCard.them_label,
      usPoints,
      themPoints,
      gapStatement: battleCard.gap_statement,
      keyDifferentiator: battleCard.key_differentiator,
      signalReference: battleCard.signal_reference,
    }
  }

  const submitPrompt = async (prompt: string) => {
    const trimmedInput = prompt.trim()
    if (!trimmedInput || typing) return

    onSessionActivity?.({
      threadId: sessionThreadId,
      title: trimmedInput.slice(0, 64),
      subtitle: 'Conversation active',
      stage: 'research',
      timestamp: new Date().toLocaleString(),
    })

    const userMsg: TextMessage = {
      id: Date.now().toString(),
      role: 'user',
      type: 'text',
      content: trimmedInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    const streamMessageId = `${Date.now()}-stream`
    const abortController = new AbortController()
    streamAbortRef.current = abortController
    let hasStreamedText = false
    let streamDone = false
    let thinkingBlocks: AnalyseStreamChunk[] = []
    let accumulatedAsset: Record<string, unknown> | undefined = undefined
    let accumulatedText = ''
    let accumulatedThinking = ''

    const getDisplayText = (chunk: AnalyseStreamChunk): string => {
      if (typeof chunk.text !== 'string') return ''
      const extracted = extractStreamDisplayText(chunk.text)
      return sanitizeAgentDisplayText(extracted)
    }

    const upsertStreamMessage = (chunk: AnalyseStreamChunk) => {
      if (chunk.text && chunk.text.trim()) {
        accumulatedText = chunk.text
      }
      if (chunk.thinking && chunk.thinking.trim()) {
        accumulatedThinking = chunk.thinking
      }
      if (chunk.asset && Object.keys(chunk.asset).length > 0) {
        accumulatedAsset = { ...(accumulatedAsset || {}), ...chunk.asset }
      }

      const syntheticChunk: AnalyseStreamChunk = {
        ...chunk,
        text: chunk.text || accumulatedText,
        thinking: chunk.thinking || accumulatedThinking,
        asset: (chunk.asset && Object.keys(chunk.asset).length > 0) ? chunk.asset : accumulatedAsset,
      }

      const battleCardMessage = buildBattleCardMessage(syntheticChunk, streamMessageId)
      if (battleCardMessage) {
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === streamMessageId)
          if (index === -1) return [...prev, { ...battleCardMessage, thinking: syntheticChunk.thinking }]

          const next = [...prev]
          next[index] = { ...battleCardMessage, thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : undefined, thinking: syntheticChunk.thinking } as any
          return next
        })
        hasStreamedText = true
        return
      }

      const emailSequenceMessage = buildEmailSequenceMessage(syntheticChunk, streamMessageId)
      if (emailSequenceMessage) {
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === streamMessageId)
          if (index === -1) return [...prev, { ...emailSequenceMessage, thinking: syntheticChunk.thinking }]

          const next = [...prev]
          next[index] = { ...emailSequenceMessage, thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : undefined, thinking: syntheticChunk.thinking } as any
          return next
        })
        hasStreamedText = true
        return
      }

      const linkedInPostMessage = buildLinkedInPostMessage(syntheticChunk, streamMessageId)
      if (linkedInPostMessage) {
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === streamMessageId)
          if (index === -1) return [...prev, { ...linkedInPostMessage, thinking: syntheticChunk.thinking }]

          const next = [...prev]
          next[index] = { ...linkedInPostMessage, thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : undefined, thinking: syntheticChunk.thinking } as any
          return next
        })
        hasStreamedText = true
        return
      }

      const flyerMessage = buildFlyerMessage(syntheticChunk, streamMessageId)
      if (flyerMessage) {
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === streamMessageId)
          if (index === -1) return [...prev, { ...flyerMessage, thinking: syntheticChunk.thinking }]

          const next = [...prev]
          next[index] = { ...flyerMessage, thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : undefined, thinking: syntheticChunk.thinking } as any
          return next
        })
        hasStreamedText = true
        return
      }

      const prospectApprovalMessage = buildProspectApprovalMessage(syntheticChunk, streamMessageId)
      if (prospectApprovalMessage) {
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === streamMessageId)
          if (index === -1) return [...prev, { ...prospectApprovalMessage, thinking: syntheticChunk.thinking }]

          const next = [...prev]
          next[index] = { ...prospectApprovalMessage, thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : undefined, thinking: syntheticChunk.thinking } as any
          return next
        })
        hasStreamedText = true
        return
      }

      const competitiveMapMessage = buildCompetitiveMapMessage(syntheticChunk, streamMessageId)
      if (competitiveMapMessage) {
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === streamMessageId)
          if (index === -1) return [...prev, { ...competitiveMapMessage, thinking: syntheticChunk.thinking }]

          const next = [...prev]
          next[index] = { ...competitiveMapMessage, thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : undefined, thinking: syntheticChunk.thinking } as any
          return next
        })
        hasStreamedText = true
        return
      }

      if (syntheticChunk.type === 'thinking') {
        thinkingBlocks.push(syntheticChunk)
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === streamMessageId)
          if (index !== -1) {
            const next = [...prev]
            const existing = next[index] as TextMessage
            next[index] = { ...existing, thinkingBlocks: [...thinkingBlocks] }
            return next
          }

          return [
            ...prev,
            {
              id: streamMessageId,
              role: 'agent',
              type: 'text',
              content: '',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              thinkingBlocks: [...thinkingBlocks],
            },
          ]
        })
        return
      }

      const chunkText = getDisplayText(syntheticChunk)
      if (!chunkText && !syntheticChunk.thinking) return

      const stage = resolveStage(syntheticChunk.action)
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      const asset = syntheticChunk.asset as Record<string, any> | undefined
      const sourceDetails = asset?.source_details || asset?.sources || []

      setMessages(prev => {
        const index = prev.findIndex(msg => msg.id === streamMessageId)
        if (index === -1) {
          hasStreamedText = true
          return [
            ...prev,
            {
              id: streamMessageId,
              role: 'agent',
              type: 'text',
              stage,
              content: chunkText,
              thinking: syntheticChunk.thinking,
              timestamp,
              thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : undefined,
              sourceDetails: Array.isArray(sourceDetails) && sourceDetails.length > 0 ? sourceDetails : undefined,
            },
          ]
        }

        const next = [...prev]
        const existing = next[index]
        if (existing.type !== 'text') {
          const updated = {
            ...existing,
            stage: stage ?? existing.stage,
            timestamp,
            thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : existing.thinkingBlocks,
            thinking: syntheticChunk.thinking,
          } as any
          if ('intro' in updated) {
            updated.intro = chunkText || updated.intro
          }
          next[index] = updated as Message
          return next
        }

        const existingText = existing as TextMessage
        next[index] = {
          ...existingText,
          content: chunkText || existingText.content,
          thinking: syntheticChunk.thinking,
          stage: stage ?? existingText.stage,
          timestamp,
          thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : existingText.thinkingBlocks,
          sourceDetails: Array.isArray(sourceDetails) && sourceDetails.length > 0 ? sourceDetails : existingText.sourceDetails,
        }
        return next
      })
    }

    try {
      await streamAnalyse(
        {
          query: trimmedInput,
          session_id: sessionThreadId,
          use_mock: false,
        },
        {
          signal: abortController.signal,
          onChunk: chunk => {
            if (chunk.error) {
              throw new Error(chunk.detail || chunk.error)
            }

            if (chunk.done) {
              streamDone = true
              // Close the reader immediately so UI exits streaming state promptly.
              abortController.abort()
              return
            }

            upsertStreamMessage(chunk)
          },
        }
      )

      if (!hasStreamedText && streamDone) {
        setMessages(prev => [
          ...prev,
          {
            id: `${Date.now()}-stream-fallback`,
            role: 'agent',
            type: 'text',
            stage: 'feedback',
            content: 'Analysis completed, but no displayable response payload was returned. Please try again or run research first.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            thinkingBlocks: thinkingBlocks.length > 0 ? [...thinkingBlocks] : undefined,
          },
        ])
      }

      if (!hasStreamedText && !streamDone) return
    } catch (error) {
      if (abortController.signal.aborted) return

      const message = error instanceof Error ? error.message : 'Failed to connect to analysis stream.'
      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-stream-error`,
          role: 'agent',
          type: 'text',
          stage: 'feedback',
          content: `Connection error: ${message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null
      }
      setTyping(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    const maxHeight = 180
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [input])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!sessionThreadId) return
    if (hydratedSessionRef.current !== sessionThreadId) return

    if (messages.length === 0) return

    const payload = {
      messages,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [messages, sessionThreadId, storageKey])

  useEffect(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setTyping(false)
    setSelectedGapId(null)
    setContentChannelId('email')
    setInput('')

    if (typeof window === 'undefined') {
      setMessages([])
      hydratedSessionRef.current = sessionThreadId
      return
    }

    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      setMessages([])
      hydratedSessionRef.current = sessionThreadId
      return
    }

    try {
      const parsed = JSON.parse(raw) as { messages?: Message[] }
      const hydratedMessages = Array.isArray(parsed.messages) ? parsed.messages : []
      const sanitizedMessages = hydratedMessages.map((message): Message => {
        if (message.type !== 'gapmap') return message

        const hasValidCompetitors =
          Array.isArray(message.competitors) &&
          message.competitors.length > 0 &&
          message.competitors.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))

        if (hasValidCompetitors) return message

        return {
          id: message.id,
          role: message.role,
          type: 'text',
          stage: message.stage,
          timestamp: message.timestamp,
          content: message.intro || 'Competitive map data is unavailable for this response.',
        }
      })

      setMessages(sanitizedMessages)
    } catch {
      setMessages([])
    }

    hydratedSessionRef.current = sessionThreadId
  }, [sessionThreadId, workspaceSessionId])

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort()
      streamAbortRef.current = null
    }
  }, [])

  const stopStreaming = () => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setTyping(false)
  }

  const sendMessage = async () => {
    await submitPrompt(input)
  }

  const deployVariant = (variant: 'A' | 'B', variantLabel: string) => {
    void submitPrompt(`Deploy ${variantLabel}`)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleGapSelect = (gap: GapZone) => {
    setSelectedGapId(gap.id)

    const agentMsg: TextMessage = {
      id: `${Date.now()}-gap`,
      role: 'agent',
      type: 'text',
      stage: 'generate',
      content: `I'll generate an outreach sequence specifically for this untapped ${gap.description} segment.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, agentMsg])
  }

  const handleMoveContent = (fromChannelId: string, toChannelId: string) => {
    setContentChannelId(toChannelId)

    const channelName = (id: string) => {
      if (id === 'linkedin') return 'LinkedIn'
      if (id === 'email') return 'Email'
      if (id === 'twitter') return 'Twitter'
      return id
    }

    const fromName = channelName(fromChannelId)
    const toName = channelName(toChannelId)

    const content =
      fromChannelId === 'email' && toChannelId === 'linkedin'
        ? 'Stop emailing; moving all content resources to LinkedIn. I\'ll rebuild the sequence for LinkedIn-first execution.'
        : `Reallocating content from ${fromName} to ${toName}. I\'ll shift the campaign plan to prioritize ${toName}.`

    const agentMsg: TextMessage = {
      id: `${Date.now()}-reach`,
      role: 'agent',
      type: 'text',
      stage: 'feedback',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, agentMsg])
  }

  const handleGenerateLinkedInPost = () => {
    const postMsg: LinkedInPostMessage = {
      id: `${Date.now()}-linkedinpost`,
      role: 'agent',
      type: 'linkedinpost',
      stage: 'generate',
      intro: 'Drafted a LinkedIn post preview. You can edit the description, regenerate the image, or upload a custom image before publishing.',
      title: 'LinkedIn Post Draft: Signal-Aware Outreach Wins',
      description:
        'Most outreach fails because automation reads like automation. The next edge is signal-aware personalization that feels human, specific, and worth replying to.',
      imageSeed: 2,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, postMsg])
  }

  const appendIntelligenceDemo = (action: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (action === 'Generate positioning gap map') {
      const demoMessage: GapMapMessage = {
        id: `${Date.now()}-gapmap-demo`,
        role: 'agent',
        type: 'gapmap',
        stage: 'research',
        intro: 'Mapped competitor positioning on price versus automation level. Click a gap to target an underserved segment.',
        title: 'AI SDR Positioning Gap Map',
        xLabel: 'Price (low -> high)',
        yLabel: 'Automation Level (low -> high)',
        competitors: [
          { name: 'Apollo', x: 58, y: 74 },
          { name: 'Outreach', x: 81, y: 78 },
          { name: 'Clay', x: 69, y: 64 },
          { name: 'Lemlist', x: 46, y: 52 },
        ],
        gaps: [
          { id: 'high-auto-low-price', label: 'Gap A\nHigh Auto / Low Price', x: 20, y: 82, description: 'high-automation / low-price' },
          { id: 'mid-auto-mid-price', label: 'Gap B\nMid Auto / Mid Price', x: 38, y: 55, description: 'balanced automation / mid-price' },
        ],
        timestamp,
      }
      setMessages(prev => [...prev, demoMessage])
      return true
    }

    if (action === 'Generate competitor language map') {
      const demoMessage: GapMapMessage = {
        id: `${Date.now()}-language-map-demo`,
        role: 'agent',
        type: 'gapmap',
        stage: 'research',
        intro: 'Plotted competitor messaging by specificity and proof depth to reveal language whitespace.',
        title: 'Competitor Language Map',
        xLabel: 'Message Specificity (generic -> specific)',
        yLabel: 'Proof Depth (claims -> evidence)',
        competitors: [
          { name: 'Apollo', x: 42, y: 34 },
          { name: 'Outreach', x: 56, y: 48 },
          { name: 'Clay', x: 63, y: 59 },
          { name: 'Lemlist', x: 49, y: 41 },
        ],
        gaps: [
          { id: 'high-specific-high-proof', label: 'Gap A\nHigh Specific / High Proof', x: 82, y: 82, description: 'high-specificity / high-proof messaging' },
          { id: 'mid-specific-high-proof', label: 'Gap B\nMid Specific / High Proof', x: 66, y: 78, description: 'mid-specificity / high-proof messaging' },
        ],
        timestamp,
      }
      setMessages(prev => [...prev, demoMessage])
      return true
    }

    if (action === 'Generate audience pain map') {
      const demoMessage: GapMapMessage = {
        id: `${Date.now()}-pain-map-demo`,
        role: 'agent',
        type: 'gapmap',
        stage: 'research',
        intro: 'Mapped audience pain clusters by urgency and commercial impact to prioritize targeting.',
        title: 'Audience Pain Map',
        xLabel: 'Pain Urgency (low -> high)',
        yLabel: 'Revenue Impact (low -> high)',
        competitors: [
          { name: 'Manual Prospecting', x: 72, y: 83 },
          { name: 'Low Reply Rates', x: 78, y: 76 },
          { name: 'Tool Sprawl', x: 61, y: 58 },
          { name: 'Poor Personalization', x: 81, y: 88 },
        ],
        gaps: [
          { id: 'urgent-high-impact', label: 'Gap A\nUrgent + High Impact', x: 90, y: 90, description: 'urgent high-impact pain' },
          { id: 'mid-urgent-high-impact', label: 'Gap B\nMid Urgent + High Impact', x: 72, y: 84, description: 'mid-urgent high-impact pain' },
        ],
        timestamp,
      }
      setMessages(prev => [...prev, demoMessage])
      return true
    }

    if (action === 'Generate channel attention map') {
      const demoMessage: ReachMapMessage = {
        id: `${Date.now()}-channel-map-demo`,
        role: 'agent',
        type: 'reachmap',
        stage: 'feedback',
        intro: 'Built channel attention map from recent engagement data so you can reallocate effort quickly.',
        title: 'Campaign Attention Map: LinkedIn vs Email vs Twitter',
        channels: [
          { id: 'linkedin', label: 'LinkedIn', replyRate: 17, x: 67, y: 58, color: '#111111' },
          { id: 'email', label: 'Email', replyRate: 3, x: 30, y: 32, color: '#555555' },
          { id: 'twitter', label: 'Twitter', replyRate: 7, x: 78, y: 24, color: '#777777' },
        ],
        timestamp,
      }
      setMessages(prev => [...prev, demoMessage])
      return true
    }

    return false
  }

  const quickActions = activeTab === 'intelligence'
    ? [
      'Generate positioning gap map',
      'Generate competitor language map',
      BATTLE_CARD_DEMO_LABEL,
      'Generate audience pain map',
      'Generate channel attention map',
    ]
    : [
      'Scan competitor messaging',
      'Generate LinkedIn post',
      BATTLE_CARD_DEMO_LABEL,
      'Run A/B on last variant',
      'Show feedback signals',
    ]

  const showEmptyWorkspace = messages.length === 0 && !typing
  const forceOutreachQueueView = activeTab === 'outreach'
  const handleQuickPrompt = (prompt: string) => {
    if (prompt === BATTLE_CARD_DEMO_LABEL) {
      void submitPrompt(BATTLE_CARD_DEMO_PROMPT)
      return
    }
    setInput(prompt)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 52,
          // borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Platform Libre
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>

          </p>
        </div>


      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: showEmptyWorkspace || forceOutreachQueueView ? '0' : '24px 24px 8px',
        }}
      >
        {forceOutreachQueueView ? (
          <EmptyWorkspaceState
            activeTab={activeTab}
            selectedGapId={selectedGapId}
            onSelectGap={handleGapSelect}
            contentChannelId={contentChannelId}
            onMoveContent={handleMoveContent}
            selectedHistorySourceId={selectedHistorySourceId}
            onHistorySourceSelect={onHistorySourceSelect}
            sessionThreadId={sessionThreadId}
          />
        ) : showEmptyWorkspace ? (
          activeTab === 'content' && showNewChatLanding ? (
            <EmptyLandingState
              input={input}
              onInputChange={setInput}
              onSubmit={sendMessage}
              onQuickPrompt={handleQuickPrompt}
            />
          ) : (
            <EmptyWorkspaceState
              activeTab={activeTab}
              selectedGapId={selectedGapId}
              onSelectGap={handleGapSelect}
              contentChannelId={contentChannelId}
              onMoveContent={handleMoveContent}
              selectedHistorySourceId={selectedHistorySourceId}
              onHistorySourceSelect={onHistorySourceSelect}
              sessionThreadId={sessionThreadId}
            />
          )
        ) : (
          messages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              selectedGapId={selectedGapId}
              onSelectGap={handleGapSelect}
              contentChannelId={contentChannelId}
              onMoveContent={handleMoveContent}
              onDeployVariant={deployVariant}
              sessionThreadId={sessionThreadId}
              isStreaming={
                typing &&
                index === messages.length - 1 &&
                msg.role === 'agent' &&
                msg.type === 'text'
              }
            />
          ))
        )}
        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!showEmptyWorkspace && !forceOutreachQueueView && (
        <div
          style={{
            padding: '12px 20px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {quickActions.map(action => (
              <button
                key={action}
                onClick={() => {
                  if (activeTab === 'intelligence' && appendIntelligenceDemo(action)) {
                    onSessionActivity?.({
                      threadId: sessionThreadId,
                      title: action,
                      subtitle: 'Demo generated',
                      stage: 'research',
                      timestamp: new Date().toLocaleString(),
                    })
                    return
                  }
                  if (action === 'Generate LinkedIn post') {
                    handleGenerateLinkedInPost()
                    return
                  }
                  if (action === BATTLE_CARD_DEMO_LABEL) {
                    void submitPrompt(BATTLE_CARD_DEMO_PROMPT)
                    return
                  }
                  setInput(action)
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid var(--border-bright)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                    ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--signal-dim)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                    ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)'
                }}
              >
                {action}
              </button>
            ))}
          </div>

          {/* Text input */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--border-bright)',
              background: 'var(--bg-card)',
              transition: 'border-color 0.2s',
            }}
            onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--signal-dim)' }}
            onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-bright)' }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Describe what you need — research a market, write outreach, compare variants, or close the loop..."
              rows={1}
              style={{
                flex: 1,
                minHeight: 44,
                resize: 'none',
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                fontFamily: 'var(--font-sans)',
                maxHeight: 180,
                overflowY: 'hidden',
              }}
            />
            <button
              onClick={typing ? stopStreaming : sendMessage}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: 'none',
                background: typing ? 'var(--text-muted)' : input.trim() ? 'var(--signal)' : 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: typing || input.trim() ? 'pointer' : 'default',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
              title={typing ? 'Stop' : 'Send'}
            >
              {typing ? (
                <Square size={13} color="#ffffff" strokeWidth={2} />
              ) : (
                <Send size={14} color={input.trim() ? '#ffffff' : 'var(--text-muted)'} strokeWidth={2} />
              )}
            </button>
          </div>

          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            Veracity · vectoragents.ai · Signal-to-Action Agent
          </p>
        </div>
      )}

    </div>
  )
}
