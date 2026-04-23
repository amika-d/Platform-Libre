import asyncio
import json
import uuid

from psycopg_pool import AsyncConnectionPool

from src.agents.graph import get_compiled_graph
from src.state.agent_state import AgentState, create_initial_state
from src.core.config import settings


# ── Constants ─────────────────────────────────────────────────────────────────

COMMANDS      = "/state  /state -v  /approve  /new  /quit"
DIVIDER       = "-" * 60
DIVIDER_HEAVY = "=" * 60


# ── Formatting Helpers ─────────────────────────────────────────────────────────

def _print_header(state: AgentState) -> None:
    print()
    print(DIVIDER_HEAVY)
    print("  Veracity — Growth Intelligence CLI")
    print(f"  Commands: {COMMANDS}")
    print(DIVIDER_HEAVY)
    print(f"\n  Product : {state['product_context']}")
    print(f"  Segment : {state['target_segment']}")
    print(f"  Session : {state['session_id']}")
    print()


def _inspect_state(state: AgentState, verbose: bool = False) -> None:
    print()
    print(DIVIDER)
    print("STATE INSPECTION")
    print(DIVIDER)

    print("\n[EXECUTION]")
    print(f"  Loop        : {state.get('_loop_count', 0)}")
    print(f"  Next Action : {state.get('next_action') or '(none)'}")

    print("\n[RESEARCH]")
    print(f"  Done    : {bool(state.get('summary'))}")
    print(f"  Domains : {state.get('active_domains', [])}")
    if state.get("targeted_query"):
        print(f"  Query   : {state['targeted_query']}")
    if state.get("summary"):
        print(f"  Summary : {state['summary'][:150]}...")

    print("\n[THINKING]")
    thinking = state.get("thinking", "")
    print(f"  {thinking[:300]}" if thinking else "  (none)")

    print("\n[PROSPECTS]")
    print(f"  Pending  : {len(state.get('pending_prospects', []))}")
    print(f"  Approved : {len(state.get('approved_prospects', []))}")

    print("\n[ASSETS]")
    variants = state.get("drafted_variants", {})
    if variants:
        for key in variants:
            print(f"  - {key}")
    else:
        print("  (none)")

    print("\n[MEMORY]")
    print(f"  Cycle     : {state.get('cycle_number', 1)}")
    print(f"  Confirmed : {state.get('confirmed_hypotheses', [])}")
    print(f"  Failed    : {state.get('failed_angles', [])}")

    if verbose:
        print("\n[FULL STATE]")
        print(json.dumps(state, indent=2, default=str))

    print(DIVIDER)
    print()


def _print_result(state: AgentState) -> None:
    print()
    thinking = state.get("thinking", "")
    if thinking:
        print(f"  Reasoning : {thinking[:300]}")
        print()
    if state.get("response_text"):
        print(f"  Agent : {state['response_text']}")
    if state.get("drafted_variants") and state.get("last_generated"):
        last = state.get("last_generated")
        target = state["drafted_variants"].get(last, {})
        if target:
            print(f"\n📄 [Drafted: {last}]")

    if state.get("competitive_map"):
        print(f"\n🗺️  [Competitive Map]")
        print(json.dumps(state.get("competitive_map"), indent=2))


# ── DB Initialisation ──────────────────────────────────────────────────────────

async def _init_db() -> AsyncConnectionPool:
    from psycopg_pool import AsyncConnectionPool
    from src.core.config import settings

    from src.db.database import set_pool, init_db

    pool = AsyncConnectionPool(
        conninfo=settings.POSTGRES_URI,
        min_size=1,
        max_size=3,
        kwargs={"autocommit": True},
        open=False,
    )
    await pool.open()
    set_pool(pool)
    await init_db()
    return pool


# ── Main CLI Loop ──────────────────────────────────────────────────────────────

async def run() -> None:
    session_id = f"cli-{uuid.uuid4().hex[:8]}"
    state      = create_initial_state(query="", session_id=session_id)

    # Pre-inject approved prospect for local workflow testing.
    # state["approved_prospects"] = [
    #     {
    #         "name":         "Neo",
    #         "email":        "neo.techagent47@gmail.com",
    #         "company":      "Bitz and Beyond",
    #         "linkedin_url": "https://linkedin.com/in/neo-techy-540044376",
    #     }
    # ]
    
    state["campaign_id"] = "cli-test-cycle-001"
    state["session_id"]  = "cli-test-cycle-001"

    state["cycle_number"] = 1

    pool = await _init_db()
    print("DB connected.")

    print("Compiling agent...")
    agent = await get_compiled_graph(pool)
    print("Agent ready.")

    _print_header(state)

    config = {"configurable": {"thread_id": session_id}}

    while True:
        try:
            query = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nShutting down.")
            break

        if not query:
            continue

        # ── System Commands ────────────────────────────────────────────────────

        if query.lower() in ("/quit", "/exit"):
            break

        elif query.lower() == "/state":
            _inspect_state(state, verbose=False)
            continue

        elif query.lower() in ("/state -v", "/state-v"):
            _inspect_state(state, verbose=True)
            continue

        elif query.lower() == "/new":
            session_id = f"cli-{uuid.uuid4().hex[:8]}"
            state      = create_initial_state(query="", session_id=session_id)
            config     = {"configurable": {"thread_id": session_id}}
            print(f"New session: {session_id}")
            continue

        elif query.lower() == "/approve":
            pending = state.get("pending_prospects", [])
            if not pending:
                print("No pending prospects to approve.")
                continue
            state["approved_prospects"]      = pending
            state["pending_prospects"]       = []
            state["requires_human_approval"] = False
            await agent.aupdate_state(config, state)
            print(f"Approved {len(pending)} prospect(s). Type 'continue' to resume.")
            continue

        # ── Agent Execution ────────────────────────────────────────────────────

        if query.lower() == "continue":
            invoke_input = None
            print("\nResuming from checkpoint...")
        else:
            state = {
                **state,
                "query":         query,
                "_loop_count":   0,
                "next_action":   "",
                "response_text": "",
                "thinking":      "",
            }
            invoke_input = state
            print("\nThinking...")

        try:
            async for output in agent.astream(invoke_input, config=config):
                for node_name, state_update in output.items():
                    if node_name == "__interrupt__":
                        continue

                    print(f"  [{node_name}]")

                    if isinstance(state_update, dict):
                        state = {**state, **state_update}

                        if node_name == "base_agent":
                            if state_update.get("thinking"):
                                print(f"    Reasoning : {state_update['thinking'][:200]}")
                            action = state_update.get("next_action", "")
                            if action and action != "__end__":
                                print(f"    Action    : {action}")

            _print_result(state)

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

            try:
                snapshot = await agent.aget_state(config)
                if snapshot.values:
                    state = snapshot.values
                    print("State synced from checkpoint.")
            except Exception:
                pass

    # ── Teardown ───────────────────────────────────────────────────────────────
    try:
        from src.rag.signals import close_rag_clients
        await close_rag_clients()
        await pool.close()
    except (Exception, asyncio.CancelledError):
        pass



if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("\nGoodbye.")