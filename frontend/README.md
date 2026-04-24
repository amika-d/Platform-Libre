# Veracity — Signal to Action

> From market signal to live campaign in a single conversation.

A Next.js 14 hackathon project for the **Veracity Deep Hack** challenge. A growth intelligence platform where research, content generation, A/B testing, and feedback loops happen inside one conversational workspace — no context switching.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
signal-to-action/
├── app/
│   ├── layout.tsx          # Fonts (Playfair Display, JetBrains Mono, DM Sans)
│   ├── globals.css         # Dark editorial theme + CSS variables
│   └── page.tsx            # Root layout: Sidebar + Chat + History
├── components/
│   ├── Sidebar.tsx         # Icon nav: Intelligence / Content / Outreach / Signals / A/B / History
│   ├── ChatWorkspace.tsx   # Main conversation area with message rendering
│   ├── HistoryPanel.tsx    # Right panel: campaign history + artifacts
│   ├── StageBadge.tsx      # Stage indicators: research / generate / ab / feedback / refined
│   ├── ABCard.tsx          # Ephemeral UI: side-by-side variant comparison + deploy
│   ├── ClarifyCard.tsx     # Ephemeral UI: inline channel/segment choice buttons
│   └── IntelCard.tsx       # Market intelligence card with signal sentiment
```

---

## Design System

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0d0b08` | App background |
| `--bg-secondary` | `#131008` | Sidebar, topbar |
| `--bg-card` | `#1c1609` | Message cards |
| `--signal` | `#e8a020` | Primary brand accent |
| `--action` | `#c84820` | CTA / refined cycle |
| `--text-primary` | `#f0e8d0` | Main text |
| `--text-secondary` | `#a09070` | Body / agent text |

### Stage Colors
| Stage | Color | Meaning |
|-------|-------|---------|
| Research | `#6090e0` | Market intelligence scanning |
| Generate | `#60c080` | Content creation |
| A/B | `#c080e0` | Variant comparison |
| Feedback | `#e8a020` | Loop closure, signals |
| Refined | `#e06040` | Next cycle, sharper |

---

## Ephemeral UI Components

These materialise inside the conversation thread — no external tools, no links.

### `<ABCard>`
Side-by-side variant comparison grid. Subject lines, opening hooks, CTAs, and predicted reply rates. Click to select and deploy.

### `<ClarifyCard>`
Inline choice buttons when the agent needs to narrow scope (channel, segment, angle). User clicks, not types.

### `<IntelCard>`
Intelligence findings card with sentiment-tagged signals (positive/negative/neutral), source count, and summary.

---

## The Growth Loop

```
01 Market Intelligence → 02 Content Generation → 03 Multi-channel Outreach
       ↑                                                        |
05 Refined Intelligence ← 04 Feedback & Signals ←──────────────┘
```

The conversation thread is the campaign workspace. All stages flow without switching tools.

---

## Extending with Claude API

The `ChatWorkspace` component is ready for real Claude API calls. Replace the simulated response in `sendMessage()`:

```typescript
const response = await fetch('/api/agent', {
  method: 'POST',
  body: JSON.stringify({ messages, userInput: input }),
})
```

Create `app/api/agent/route.ts` to proxy to Anthropic's API with your multi-agent orchestration logic.

---

## Tech Stack

- **Next.js 14** — App Router
- **TypeScript** — Full type safety
- **Tailwind CSS** — Utility styling
- **Lucide React** — Icons
- **Google Fonts** — Playfair Display, JetBrains Mono, DM Sans

---

Built for vectoragents.ai · Veracity Deep Hack · 2025
# signal-to-action
