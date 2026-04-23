import asyncio
from psycopg_pool import AsyncConnectionPool
from src.core.config import settings
from src.db.database import set_pool, init_db

CAMPAIGN_ID = "cli-1c66e2b3"


async def main():
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

    print("\n--- TEST 1: get_variant_stats ---")
    from src.db.outreach import get_variant_stats
    stats = await get_variant_stats(CAMPAIGN_ID)
    print(f"stats: {stats}")

    print("\n--- TEST 2: get_replies ---")
    from src.db.outreach import get_replies
    replies = await get_replies(CAMPAIGN_ID)
    print(f"replies: {replies}")

    print("\n--- TEST 3: save_hypothesis ---")
    from src.db.hypotheses import save_hypothesis, get_hypotheses
    await save_hypothesis({
        "campaign_id":          CAMPAIGN_ID,
        "cycle_number":         1,
        "hypothesis":           "Compliance angle resonates with Series A CTOs",
        "confirmed":            True,
        "confidence":           "high",
        "failed_angle":         "",
        "segment":              "Series A CTOs",
        "best_channel":         "email",
        "rule_for_next_cycle":  "Lead with time-saved not risk-avoided",
        "variant_a_open_rate":  100.0,
        "variant_a_reply_rate": 100.0,
        "variant_a_meetings":   0,
        "variant_b_open_rate":  0,
        "variant_b_reply_rate": 0,
        "variant_b_meetings":   0,
        "winner":               "A",
    })
    records = await get_hypotheses(CAMPAIGN_ID)
    print(f"campaign_memory: {records}")

    print("\n--- TEST 4: process_feedback_node ---")
    from agents.nodes.nodes import process_feedback_node
    from src.state.agent_state import create_initial_state

    state = create_initial_state(query="process feedback", session_id=CAMPAIGN_ID)
    state["campaign_id"]    = CAMPAIGN_ID
    state["cycle_number"]   = 1
    state["target_segment"] = "Series A CTOs"
    state["drafted_variants"] = {
        "email_sequence": {
            "variants": [
                {"id": "A", "angle": "Compliance saves time", "hypothesis": "Time angle wins"},
                {"id": "B", "angle": "Compliance reduces risk", "hypothesis": "Risk angle wins"},
            ]
        }
    }

    result = await process_feedback_node(state)
    print(f"feedback_result : {result.get('feedback_result')}")
    print(f"response        : {result.get('response_text')}")
    print(f"confirmed       : {result.get('confirmed_hypotheses')}")
    print(f"cycle_number    : {result.get('cycle_number')}")

    await pool.close()
    print("\n✅ all tests done")


if __name__ == "__main__":
    asyncio.run(main())