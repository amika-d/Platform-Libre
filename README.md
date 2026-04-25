# Platform Libre — LangGraph B2B Growth Campaign System

<!-- 📸 PLACEHOLDER FOR PLATFORM SCREENSHOT -->
![Platform Snapshot](./assets/new-chat.png)

**A multi-agent growth campaign orchestrator for B2B outreach with AI-powered research, content generation, and multi-cycle A/B testing.**

Built for the Veracity AI Hackathon.

## Problem

Growth teams waste time on:
- Manual research across multiple signals (market, competitor, intent, positioning)
- Copywriting dozens of email/LinkedIn variants without research backing
- A/B testing without proper hypothesis tracking and learning loops
- Manual prospect tracking and campaign management

**Platform Libre** automates this: research → generate → launch → learn → next cycle.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LangGraph StateGraph                          │
│                    (Postgres Checkpointing)                          │
└────────────┬────────────────────────────────────────────────────────┘
             │
    ┌────────▼────────────────────────────────────────────────────┐
    │                   Base Agent (Nadia)                         │
    │    Orchestrates via tool routing + decision rules            │
    └────────┬────────────────────────────────────────────────────┘
             │
    ┌────────┴──────────────────────────────────────┐
    │                                               │
    ▼                                               ▼
┌──────────────────────┐                  ┌──────────────────────┐
│  Research Supervisor │                  │  Generation Nodes    │
│  (Parallel Domains)  │                  │  (Email, LinkedIn,   │
│                      │                  │   Battle Card, Flyer)│
│ • Market             │                  │                      │
│ • Competitor         │                  │ + Refinement Node    │
│ • Intent             │                  │ + Feedback Loop      │
│ • Positioning        │                  └──────────────────────┘
│ • Channel            │
│ • Adjacent           │
│ • Contextual         │
│ • Win/Loss           │
└──────────────────────┘
         │
    ┌────▼─────────────────────────────────────────────────────┐
    │          Postgres State Persistence                      │
    │  (Campaign memory, outreach tracking, hypothesis ledger) │
    └────┬─────────────────────────────────────────────────────┘
         │
    ┌────┴──────────────────────────────┐
    │                                   │
    ▼                                   ▼
┌──────────────────────┐      ┌──────────────────────┐
│  Resend (Email)      │      │  Unipile (LinkedIn)  │
│  + ARQ Task Queue    │      │  + ARQ Task Queue    │
│  + Cloudflare Workers│      │  (DM outreach)       │
└──────────────────────┘      └──────────────────────┘
```

### Agent Workflow

1. **User Query** → Base Agent (Nadia) evaluates decision rules
2. **Research** (if needed) → Supervisor spawns 8 parallel domain agents
3. **Synthesis** → Combine findings into opportunities, risks, recommendations
4. **Generate** → Email, LinkedIn, battle card, flyer with variants
5. **Find & Approve Prospects** → Search LinkedIn, human review, approval
6. **Launch** → Queue emails & LinkedIn DMs via background workers
7. **Track Replies** → Cloudflare Email Workers ingest bounces, replies
8. **Process Feedback** → Extract learning, update confirmed hypotheses
9. **Cycle 2+** → Regenerate with learned constraints

---

## Prerequisites

### API Keys Required

| Service | Purpose | Where to Get |
|---------|---------|-------------|
| **OpenRouter** | LLM routing | https://openrouter.ai/keys |
| **Resend** | Email delivery | https://resend.com/api-keys |
| **Unipile** | LinkedIn outreach | https://www.unipile.com |
| **Tavily** | Live web search | https://tavily.com |
| **Hunter.io** | Email discovery | https://hunter.io/api |
| **Qdrant Cloud** | Vector embeddings | https://qdrant.tech/cloud |
| **FAL.ai** | Image generation | https://fal.ai/dashboard |
| **Cloudflare** | Email workers, webhooks | https://dash.cloudflare.com |
| **NGrok** (dev only) | Webhook tunneling | https://ngrok.com |

### System Requirements

- Python 3.10+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (recommended)

---

## Environment Variables

Create `.env` in project root:

```bash
# ── LLM Configuration ────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-v1-...
LLM_MODEL=openrouter/deepseek/deepseek-v3.2
MAX_TOKENS=8192
TEMPERATURE=0.0
REQUEST_TIMEOUT=120

# ── Vector Database (Qdrant) ─────────────────────────────────
QDRANT_CLOUD_URL=https://...qdrant.io:6333
QDRANT_API_KEY=...

# ── Search & Discovery ───────────────────────────────────────
TAVILY_API_KEY=tvly-...
FIRECRAWL_API_KEY=fc-...
EXA_API_KEY=...
ALPHA_VANTAGE_API_KEY=...
HUNTER_API_KEY=...

# ── Email Service (Resend) ───────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM=outreach@yourcompany.com
RESEND_WEBHOOK_SECRET=whsec_...

# ── LinkedIn Service (Unipile) ───────────────────────────────
UNIPILE_API_KEY=sk...
UNIPILE_DSN=https://api39.unipile.com:16973
UNIPILE_ACCOUNT_ID=...

# ── Image Generation ─────────────────────────────────────────
FAL_API_KEY=...

# ── Infrastructure ───────────────────────────────────────────
POSTGRES_URI=postgresql://postgres:postgres@postgres:5432/growth_db
REDIS_URI=redis://redis:6379/0

# ── Webhooks & Tunneling ────────────────────────────────────
NGROK_AUTHTOKEN=...
NGROK_DOMAIN=yoursubdomain.ngrok-free.dev
APP_PORT=8000

# ── Campaign Settings ────────────────────────────────────────
MAX_DAILY_INVITES=20
LINKEDIN_SESSION_FILE=session.json
```

See `.env.example` for all options.

---

## Quick Start (Docker)

### 1. Clone & Setup

```bash
git clone <repo>
cd ai-backend
cp .env.example .env
# Update .env with your API keys
```

### 2. Run Services

```bash
docker compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- FastAPI app (port 8000)

### 3. Run Migrations

```bash
docker compose exec app python -m alembic upgrade head
# OR manually:
docker compose exec -T postgres psql -U postgres -d growth_db < migrations/001_outreach_status.sql
docker compose exec -T postgres psql -U postgres -d growth_db < migrations/002_campaign_memory.sql
docker compose exec -T postgres psql -U postgres -d growth_db < migrations/003_linkedin_outreach_status.sql
docker compose exec -T postgres psql -U postgres -d growth_db < migrations/004_add_cycle_number.sql
```

### 4. Start Background Workers

```bash
# Terminal 1: Email worker
docker compose exec app uv run run_worker.py

# Terminal 2: LinkedIn worker
docker compose exec app uv run run_linkedin_worker.py
```

### 5. Run CLI

```bash
docker compose exec app python -m src.main --help
```

---

## Local Development (Without Docker)

### 1. Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# or: .venv\Scripts\activate  # Windows
```

### 2. Install Dependencies

```bash
uv sync
```

### 3. Start Postgres & Redis

```bash
# Option A: Use docker for services only
docker compose up -d postgres redis

# Option B: Install locally
# PostgreSQL: https://www.postgresql.org/download/
# Redis: https://redis.io/download/
```

### 4. Run Migrations

```bash
python -m alembic upgrade head
```

### 5. Run App

```bash
uvicorn src.main:app --reload --port 8000
```

### 6. Run Workers

```bash
# Terminal 1
python run_worker.py

# Terminal 2
python run_linkedin_worker.py
```

---

## Migrations

Run in order:

```bash
# 1. Create outreach_status table
docker compose exec -T postgres psql -U postgres -d growth_db < migrations/001_outreach_status.sql

# 2. Add campaign_memory table (for hypothesis tracking)
docker compose exec -T postgres psql -U postgres -d growth_db < migrations/002_campaign_memory.sql

# 3. Add linkedin_outreach_status table
docker compose exec -T postgres psql -U postgres -d growth_db < migrations/003_linkedin_outreach_status.sql

# 4. Add cycle_number column
docker compose exec -T postgres psql -U postgres -d growth_db < migrations/004_add_cycle_number.sql

# Verify:
docker compose exec -T postgres psql -U postgres -d growth_db -c "\dt"
```

---

## Testing

### Test Research Agent

```bash
python -m pytest tests/test_strategic_analysis.py -v
```

Tests parallel domain research and synthesis.

### Test Email Generation & Queueing

```bash
python -m pytest tests/test_launch_campaign.py -v
```

Generates email, inserts prospects into DB, pushes jobs to Redis.

### Test LinkedIn Worker

```bash
python -m pytest tests/test_linkedin_e2e.py -v
```

End-to-end LinkedIn DM sending and reply tracking.

### Test Feedback Loop

```bash
python -m pytest tests/feedbackloop_test.py -v
```

A/B test result processing, hypothesis extraction, cycle advancement.

### Test Webhooks

```bash
python -m pytest tests/test_webhook.py -v
```

Resend bounce/complaint/delivery events, Unipile LinkedIn message events.

### Manual Webhook Testing (Local)

```bash
# Terminal 1: Start ngrok tunnel
ngrok http 8000

# Terminal 2: Send test webhook
curl -X POST http://localhost:8000/webhook/resend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.bounced",
    "data": {"email": "test@example.com", "reason": "Invalid mailbox"}
  }'
```

---

## Demo Walkthrough

### Scenario: SaaS Founder Wants to Reach CFOs About Cost Optimization

#### Step 1: Kickoff Research

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Research CFOs who care about cost optimization. Product: CloudSaver.",
    "product_context": "Cloud cost management platform",
    "target_segment": "Finance leaders (CFOs, Controllers)"
  }'
```

**Behind the scenes:**
- Nadia evaluates rules → triggers `run_research`
- Supervisor spawns 8 domain agents in parallel (market, competitor, intent, positioning, channel, adjacent, contextual, win_loss)
- Synthesis agent combines findings → `summary`, `top_opportunities`, `top_risks`

**Response:**
```json
{
  "response_text": "Research complete. Found 3 key opportunities: cost visibility, compliance automation, audit trails.",
  "summary": "...",
  "top_opportunities": [
    "78% of CFOs cite cost visibility as top pain point",
    "Compliance auditing costs average $50K+/year",
    "..."
  ]
}
```

#### Step 2: Generate Campaign Assets

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate 2 email variants and 2 LinkedIn posts for CFOs.",
    "campaign_id": "campaign_001"
  }'
```

**State after generation:**
```
drafted_variants:
  email_sequence:
    variants:
      - id: "A", angle: "cost visibility", hypothesis: "...", touch_1, touch_2, touch_3
      - id: "B", angle: "compliance automation", hypothesis: "...", ...
  linkedin_posts:
    posts:
      - id: "A", hook: "...", body: "...", cta: "...", image_url: "..."
      - id: "B", ...
```

#### Step 3: Find & Approve Prospects

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find CFO prospects on LinkedIn in North America, B2B SaaS companies 50-500 employees."
  }'
```

**System pauses at `wait_for_prospect_approval`** → returns list of 10 LinkedIn profiles.

```bash
curl -X POST http://localhost:8000/approve \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "campaign_001",
    "approved_prospects": [
      {"name": "Jane Doe", "linkedin_url": "...", "email": "jane@techco.com", "company": "TechCo"},
      {"name": "John Smith", ...},
      ...
    ]
  }'
```

#### Step 4: Launch Campaign

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Launch campaign now.",
    "campaign_id": "campaign_001"
  }'
```

**Behind the scenes:**
- `launch_campaign_node` inserts prospects into `outreach_status` table
- A/B assignment: prospects[0, 2, 4...] → variant A; prospects[1, 3, 5...] → variant B
- Push email jobs to Redis via ARQ → workers consume and send via Resend
- Push LinkedIn jobs to Redis → workers send DMs via Unipile

**Response:**
```
Campaign launched — 10 emails queued.
Variant A: 5 | Variant B: 5
```

#### Step 5: Track Replies & Process Feedback (After 3 days)

**Cloudflare Email Workers** ingests Resend events:
```
email.sent → outreach_status.status = "sent", timestamp
email.opened → outreach_status.status = "opened", timestamp
email.clicked → outreach_status.status = "clicked", timestamp
email.replied → outreach_status.status = "replied", raw_reply
```

**Unipile Webhook** ingests LinkedIn messages:
```
linkedin.message → linkedin_outreach_status.status = "replied", message_text
```

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me campaign results and extract learning.",
    "campaign_id": "campaign_001"
  }'
```

**System calls `check_outreach_status_node`:**
```
Campaign `campaign_001`
  Sent: 10 | Opened: 7 | Replied: 2 | Errors: 0
  Open rate: 70% | Reply rate: 20%
  Variant A: sent=5 opened=4 replied=2 reply_rate=40%
  Variant B: sent=5 opened=3 replied=0 reply_rate=0%
```

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Process feedback from cycle 1.",
    "campaign_id": "campaign_001",
    "cycle_number": 1
  }'
```

**System calls `process_feedback_node` (version 2):**
- Fetches `variant_stats` from DB
- Compares reply_rate: Variant A wins 40% vs 0%
- Calls LLM to extract: `"hypothesis": "Cost visibility angle resonates with CFOs more than compliance automation angle"`
- Saves to `campaign_memory` table
- Sets `confirmed_hypotheses = ["Cost visibility angle resonates..."]`
- Advances to `cycle_number = 2`

**Response:**
```
Cycle 1 complete. Winner: Variant A.
Confirmed: Cost visibility angle resonates with CFOs more than compliance automation.
Rule for cycle 2: Always lead with cost visibility + ROI metrics in next cycle.
```

#### Step 6: Cycle 2 with Learned Constraints

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate 2 new email variants for cycle 2, building on confirmed insights.",
    "campaign_id": "campaign_001",
    "cycle_number": 2
  }'
```

**System state includes:**
```
confirmed_hypotheses: ["Cost visibility angle resonates..."]
failed_angles: []
```

**Generation node includes memory constraint in LLM prompt:**
```
BUILD ON THESE (confirmed true):
  ✓ Cost visibility angle resonates with CFOs more than compliance automation angle
```

New variants:
- Variant A (Cycle 2): "Cost visibility + ROI metrics" (double down on winner)
- Variant B (Cycle 2): "Cost visibility + Industry benchmarking" (test adjacent angle)

**Repeat: Find new prospects → Launch → Track → Process feedback → Cycle 3+**

---

## File Structure

```text
platform-libre/
├── frontend/                             # Next.js Application
│   ├── app/                              # App Router pages and global layouts
│   ├── components/                       # Visual UI elements and ChatWorkspace
│   ├── lib/                              # Client utilities and SSE API interfaces
│   └── public/                           # Static assets like hand.png logos
├── backend/                              # FastAPI + LangGraph Orchestrator
│   ├── src/
│   │   ├── main.py                       # FastAPI app, routes
│   ├── agents/
│   │   ├── base_agent.py                 # Nadia orchestrator, decision rules
│   │   ├── research_supervisor.py        # Parallel domain agent launcher
│   │   ├── nodes/                        # Generation & action nodes
│   │   │   ├── __init__.py               # Export all nodes
│   │   │   ├── helpers.py                # _research_context, _memory_constraints
│   │   │   ├── chat_and_approval.py      # direct_response_node, wait_for...
│   │   │   ├── prospecting.py            # find_prospects_node
│   │   │   ├── campaign_launch.py        # launch_campaign_node
│   │   │   ├── outreach_status.py        # check_outreach_status_node
│   │   │   ├── refinement.py             # refine_node
│   │   │   ├── feedback.py               # process_feedback_node
│   │   │   ├── state.py                  # update_state_node
│   │   │   └── generation/
│   │   │       ├── __init__.py
│   │   │       ├── email.py              # generate_email_node
│   │   │       ├── linkedin.py           # generate_linkedin_node, outreach
│   │   │       ├── battle_card.py        # generate_battle_card_node
│   │   │       ├── flyer.py              # generate_flyer_node
│   │   │       └── combined.py           # generate_all_node
│   │   ├── domains/                      # Domain-specific research agents
│   │   │   ├── market.py
│   │   │   ├── competitor.py
│   │   │   ├── intent.py
│   │   │   ├── positioning.py
│   │   │   ├── channel.py
│   │   │   ├── adjacent.py
│   │   │   ├── contextual.py
│   │   │   ├── win_loss.py
│   │   │   └── synthesis.py               # Synthesize domain results
│   │   ├── graph.py                      # LangGraph StateGraph definition
│   │   └── outreach/
│   │       ├── approve_outreach.py       # show_prospects_node, approve_prospects_node
│   ├── core/
│   │   ├── llm.py                        # call_llm_json, call_llm_route
│   │   ├── tools.py                      # TOOLS definition (for routing)
│   │   ├── config.py                     # settings, environment loading
│   │   └── prompts.py                    # System prompts for each domain
│   ├── db/
│   │   ├── outreach.py                   # insert_prospect, get_campaign_stats, get_variant_stats
│   │   ├── hypotheses.py                 # save_hypothesis, get_campaign_memory
│   │   └── connection.py                 # Postgres/Redis connection init
│   ├── state/
│   │   ├── agent_state.py                # TypedDict for LangGraph state
│   │   └── contracts.py                  # DomainResult, SynthesisOutput, etc.
│   ├── workers/
│   │   ├── email/
│   │   │   ├── producer.py               # push_email_job (to ARQ queue)
│   │   │   └── personaliser.py           # personalise_touch (replace tokens)
│   │   ├── linkedin/
│   │   │   ├── producer.py               # push_linkedin_job
│   │   │   └── task_handler.py           # LinkedIn DM sending
│   │   └── cloudflare/
│   │       └── email_worker_handler.py   # Ingest Resend/Unipile webhooks
│   ├── routes/
│   │   ├── chat.py                       # /chat endpoint
│   │   ├── approve.py                    # /approve endpoint
│   │   ├── webhooks.py                   # /webhook/resend, /webhook/linkedin
│   │   └── status.py                     # /status, /campaign/{id} endpoints
│   └── tools/
│       └── (shared utilities)
├── tests/
│   ├── test_launch_campaign.py
│   ├── test_linkedin_e2e.py
│   ├── test_strategic_analysis.py
│   ├── test_webhook.py
│   ├── feedbackloop_test.py
│   └── ...
├── migrations/
│   ├── 001_outreach_status.sql
│   ├── 002_campaign_memory.sql
│   ├── 003_linkedin_outreach_status.sql
│   └── 004_add_cycle_number.sql
├── run_worker.py                         # Entry point for email worker
├── run_linkedin_worker.py                # Entry point for LinkedIn worker
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
└── .env.example
```

---

## Key Concepts

### AgentState (TypedDict)

Persisted to Postgres via LangGraph checkpointing:

```python
{
  "query": str,                          # User message (each turn)
  "product_context": str,                # Product description
  "target_segment": str,                 # Target audience
  "campaign_id": str,                    # Campaign UUID
  "cycle_number": int,                   # A/B testing cycle (1, 2, 3...)
  
  # Research phase
  "summary": str,                        # Domain synthesis result
  "top_opportunities": [str],            # Extracted opportunities
  "top_risks": [str],                    # Extracted risks
  "user_provided_research": str,         # User pasted research
  
  # Generation phase
  "drafted_variants": {                  # Generated assets
    "email_sequence": {...},
    "linkedin_posts": {...},
    "battle_card": {...},
    "flyer": {...}
  },
  "last_generated": str,                 # Last generated type
  "last_refined": str,                   # Last refinement instruction
  
  # Prospecting phase
  "pending_prospects": [{...}],          # Found, awaiting approval
  "approved_prospects": [{...}],         # User-approved prospects
  
  # Outreach phase
  "outreach_status": [{...}],            # Queued jobs status
  "campaign_launched": bool,             # Launch completed
  
  # Feedback phase
  "cycle_memory": [{...}],               # Per-cycle learnings
  "confirmed_hypotheses": [str],         # Winning angles
  "failed_angles": [str],                # Losing angles
  "feedback_result": {...},              # LLM extraction
  
  # System
  "conversation_history": [{...}],       # Chat history
  "next_action": str,                    # Tool name or "__end__"
  "tool_input": {...},                   # Tool parameters
  "response_text": str,                  # Response to user
  "thinking": str,                       # LLM reasoning (optional)
  "_loop_count": int,                    # Loop counter (max 5)
}
```

### Campaign Memory (Postgres Table)

Stores hypothesis tracking across cycles:

```sql
CREATE TABLE campaign_memory (
  id BIGSERIAL PRIMARY KEY,
  campaign_id TEXT,
  cycle_number INT,
  hypothesis TEXT,
  confirmed BOOLEAN,
  segment TEXT,
  failed_angle TEXT,
  best_channel TEXT,
  confidence TEXT,
  rule_for_next_cycle TEXT,
  ...
);
```

### ARQ Task Queue (Redis)

Workers consume JSON jobs from Redis:

**Email job:**
```json
{
  "campaign_id": "c001",
  "email": "jane@company.com",
  "prospect_name": "Jane Doe",
  "variant_used": "A",
  "touch": {
    "subject": "...",
    "body": "... {name} ... {company} ...",
    "cta": "..."
  },
  "row_id": 12345
}
```

**LinkedIn job:**
```json
{
  "campaign_id": "c001",
  "linkedin_profile_url": "https://linkedin.com/in/jane-doe",
  "variant_used": "A",
  "body": "... {name} ... {company} ...",
  "row_id": 12346
}
```

### Webhook Events

**Resend Email Events** → Cloudflare Worker → `/webhook/resend`:
```json
{
  "type": "email.sent|email.opened|email.clicked|email.bounced|email.complained",
  "data": {
    "email": "jane@company.com",
    "campaign_id": "c001",
    "timestamp": "2026-04-22T10:00:00Z",
    "metadata": {...}
  }
}
```

**Unipile LinkedIn Events** → `/webhook/linkedin`:
```json
{
  "type": "linkedin.message_received",
  "data": {
    "from_profile_url": "https://linkedin.com/in/jane-doe",
    "message_body": "Thanks for reaching out!",
    "timestamp": "2026-04-22T10:05:00Z"
  }
}
```

---

## Development Workflow

### 1. Add a New Research Domain

Create `src/agents/domains/custom.py`:

```python
from src.state.contracts import DomainResult

async def run_custom_domain(query: str, context: str = "") -> DomainResult:
    """Research custom domain."""
    # ... your domain logic
    return DomainResult(
        domain="custom",
        findings="...",
        confidence_score=0.85,
        citations=[{"source": "...", "url": "..."}],
    )
```

Register in `research_supervisor.py`.

### 2. Add a New Generation Node

Create `src/agents/nodes/generation/custom.py`:

```python
from src.core.llm import call_llm_json
from src.state.agent_state import AgentState

async def generate_custom_node(state: AgentState) -> AgentState:
    """Generate custom asset."""
    result = await call_llm_json([...])
    current = state.get("drafted_variants", {})
    return {
        **state,
        "drafted_variants": {**current, "custom": result},
        "last_generated": "custom",
    }
```

Register in `src/agents/nodes/__init__.py` and `graph.py`.

### 3. Add a Webhook Handler

Create route in `src/routes/webhooks.py`:

```python
@router.post("/webhook/mychannel")
async def handle_mychannel_webhook(payload: dict):
    """Handle my channel events."""
    # Update outreach_status table
    # Trigger feedback processing if needed
    return {"status": "ok"}
```

---

## Known Limitations

### Current

1. **LinkedIn Session Management** — Currently uses browser session file (`session.json`). Requires manual login refresh if session expires.
   - **Future**: Implement automated Unipile OAuth2 flow.

2. **Email Personalization Tokens** — Only `{name}`, `{company}`, `{first_name}`.
   - **Future**: Support dynamic company research (founding year, funding, recent news).

3. **Single-Domain Research** — Runs 8 domains in parallel but doesn't cross-reference insights.
   - **Future**: Add multi-turn domain follow-up based on initial findings.

4. **Prospect Sourcing** — Only LinkedIn search via Tavily.
   - **Future**: Hunter.io + ZoomInfo + Apollo integration.

5. **Image Generation** — FAL.ai for email/LinkedIn images. Quality varies.
   - **Future**: Fine-tuned model or Midjourney integration.

6. **Reply Parsing** — Naive regex-based reply detection.
   - **Future**: LLM-based intent classification (interest, disinterest, objection).

7. **A/B Testing Cycle** — Manual "Process Feedback" trigger. No auto-rollout.
   - **Future**: Auto-advance cycle when N replies > threshold.

8. **Outreach Limit** — Hardcoded `MAX_DAILY_INVITES=20`. No progressive ramp-up.
   - **Future**: LinkedIn safety scoring, smart throttling.

### Constraints

- **Qdrant Embedding Cost**: Vector storage for research findings. Free tier: 1GB.
- **Resend Rate Limit**: 5,000 emails/day (paid plan). Local dev: 100/day.
- **Tavily Rate Limit**: 100 searches/month (free tier).
- **Unipile Session**: LinkedIn actively blocks bulk messaging. 10 DMs/day per account recommended.

---

## Future Roadmap

### Phase 2
- [ ] Auto webhook handlers for Slack notifications
- [ ] Dashboard: campaign performance, cycle progress
- [ ] Bulk prospect import via CSV/API
- [ ] Multi-channel attribution (email vs LinkedIn vs manual)

### Phase 3
- [ ] Autonomous prospect research (company news, funding, hiring)
- [ ] Dynamic email content generation (company-specific pain points)
- [ ] Automated call scheduling after positive reply
- [ ] Multi-variant battle testing (3+ variants simultaneously)

### Phase 4
- [ ] Closed-loop revenue tracking (reply → meeting → deal)
- [ ] Persona-specific variant optimization
- [ ] Competitor win/loss analysis at scale
- [ ] B2B intent data integration (6sense, Demandbase)

---

## Support & Debugging

### Check State Persistence

```bash
docker compose exec -T postgres psql -U postgres -d growth_db -c "SELECT campaign_id, cycle_number, hypothesis FROM campaign_memory LIMIT 10;"
```

### Check Email Queue Status

```bash
docker compose exec redis redis-cli KEYS "*email*"
docker compose exec redis redis-cli LRANGE queue:email 0 -1
```

### Check LinkedIn Queue Status

```bash
docker compose exec redis redis-cli KEYS "*linkedin*"
docker compose exec redis redis-cli LRANGE queue:linkedin 0 -1
```

### Check Logs

```bash
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis
```

### Restart Workers

```bash
# Kill and restart email worker
docker compose restart email-worker

# Kill and restart LinkedIn worker
docker compose restart linkedin-worker
```

---

## License

Proprietary. Built for Veracity AI Hackathon 2026.

---

**Questions?** Open an issue or contact the team at `growth@veracity.ai`.
