# Hatch-AI-Veracity 🚀

This project is an **Agentic AI Pipeline** developed for the **Veracity Hackathon**. It serves as an intelligent, automated Growth and Outreach pipeline that uses LLM-powered agents to conduct comprehensive strategic research, automatically formulate campaigns, uncover prospects, generate assets (such as emails, flyers, and battle cards), and execute outreach asynchronously.

## 🛠 Features

*   **Intelligent Orchestration:** A sequential state machine (using LangGraph) that intelligently makes decisions on what actions or tasks to execute (researching, prospecting, or reaching out).
*   **Comprehensive RAG Insights:** Integrates varied business signals such as competitive analysis, market trends, user intent, contagious markets, and win/loss records to build precise strategic context.
*   **Human-in-the-Loop:** Outreach flows capable of pausing to wait for human prospect approvals before triggering scalable asynchronous campaigns.
*   **Multichannel Outreach:** Automated tracking and queue management for dispatching targeted emails and LinkedIn messaging sequences.
*   **Automated Web Interactions:** Utilises web search and scraping to bring live context to autonomous agents.

## ⚙️ Tech Stack & Tools

*   **Web/API Framework:** `FastAPI`, `Uvicorn`, `Pydantic`
*   **Agent Orchestration:** `LangGraph`, `LangChain Core`
*   **LLMs & Automation:** `LiteLLM` (wrapper), `browser-use`, `Playwright`, `DuckDuckGo Search` / `Tavily` / `Firecrawl` (browsing/scraping)
*   **Database & State Management:** `PostgreSQL` (via `asyncpg`, `SQLAlchemy`), LangGraph Checkpointers (`langgraph-checkpoint-postgres`), `Qdrant` + `fastembed` (VectorDB/Embedding)
*   **Async Workers (Queues):** `Redis`
*   **Integrations:** `Resend` (Emails)

---

## 📂 Core Architecture Breakdown

### 1. API Gateway (`src/main.py`)
Acts as the entry point for the FastAPI server application. 
* Configures an `AsyncConnectionPool` for PostgreSQL and ensures it’s globally available for database handlers and background worker routes.
* Compiles the LangGraph agent state machine during the server's lifecycle startup context.
* Exposes HTTP routers for streaming ongoing analysis, approving prospect interactions, and capturing event webhooks (e.g., from email providers). 

### 2. The Brain & State Machine (`src/agents/`)
The core intelligence logic leveraging LangGraph to construct the agent state, primarily managed in `graph.py`.
* Features an orchestrator `base_agent.py` that delegates work into specialized execution nodes configured as a state machine.
* A `research_supervisor.py` manages deep autonomous investigations via analytical domains (e.g., `market.py`, `competitor.py`). 
* The `generator/` directory focuses on creating highly targeted outbound assets (`generate_email_node`, `generate_battle_card_node`, `generate_linkedin_node`).
* Outreach nodes embed "Human-in-the-Loop" capabilities, pausing sequences to await `approve_prospects` signals before resuming.

### 3. Retrieval-Augmented Context (`src/rag/`)
Responsible for fetching and computing domain-specific strategic signals to inject contextual ground-truth into the LLMs.
* Segregated into independent intelligence pipelines like `competitor_signals.py`, `market_signals.py`, `intent_signals.py`, etc.
* Drives semantic searches so agents have rich, up-to-date business data before generating assets. 

### 4. Async Task Processing (`src/workers/`)
Ensures scalable outbound execution without blocking the main API or agent loop.
* Utilizes an Redis architecture configured in `outreach_queue.py` with decoupled domain queues for email and LinkedIn.
* Includes a dedicated `email_worker.py` and `personaliser.py` to draft individualized texts and enqueue communications efficiently.
* Uses polling and execution routines to automate asynchronous LinkedIn operations/scraping campaigns potentially using stealth proxies.

### 5. State Storage & Analytics (`src/db/`)
Manages the relational mapping for system operations.
* Bootstraps the database connection pooling (`database.py`).
* Models specific agent assumptions or strategic data generated entirely during investigations (`hypotheses.py`).
* Manages schema modelling and operations linking to campaign statuses, allowing the agent to continuously monitor live progress via database mutations (`outreach.py`). 

---

## � Docker & Containerization

The project relies entirely on Docker Compose to manage its microservices architecture. Here's a breakdown of the services orchestrated in `docker-compose.yml`:
* **`app`**: The primary backend FastAPI service built from `./Dockerfile`. It acts as the backbone running the agent orchestration and task execution.
* **`postgres`**: The relational database storing state, schemas, and LangGraph checkpointers.
* **`redis`**: High-performance broker used for async task queues and temporary state monitoring.
* **`pgadmin`**: Database management UI provided locally (usually running on port `15050`) to monitor database tables manually.
* **`ngrok`**: Secure tunneling service (port `4040`) designed to expose the local `app` container globally, which is critical for listening to real-time Webhook events.
* **`model-gateway` (Maxim Bifrost)**: A flexible Model routing framework exposing local routes on port `4000`, meant to proxy OpenRouter APIs into standard LLM abstractions natively.

---

## �🚀 Getting Started Workflow

The project wraps extensive setup operations in Docker Compose via the `Makefile` for streamlined local development:

1. **Start the environment:**
   Boot up the entire stack including the API, Postgres, Redis, Qdrant, and background task workers.
   ```bash
   docker compose up -d
   ```

2. **Run Interactive CLI Loop:**
   Spawn an interactive Terminal UI loop via `ui/cli.py` passing right inside the active container to chat with the agent and interact with streams locally.
   ```bash
   make run L=ui/cli.py
   ```

3. **Stop & Teardown:**
   ```bash
   docker compose down
   ```

*Check the `Makefile` for more streamlined commands for debugging (`make logs`) and rebuilding containers (`make rebuild`).*
