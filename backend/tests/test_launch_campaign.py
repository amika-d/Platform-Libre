# tests/test_launch_campaign.py
"""
Mimics launch_campaign_node end-to-end:
  1. Boots DB pool
  2. Builds a fake state with one approved prospect + email sequence
  3. Calls launch_campaign_node directly
  4. Verifies DB row created
  5. Calls send_email_task directly (no Redis needed)
  6. Verifies DB row updated to 'sent'
  7. Checks campaign stats

Run:
    uv run tests/test_launch_campaign.py
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


FAKE_STATE = {
    "campaign_id":     "test-launch-001",
    "product_context": "ComplyOps — Automated SOC2 compliance for startups",
    "target_segment":  "CTOs at Seed to Series A SaaS",
    "cycle_number":    1,
    "query":           "launch the campaign",
    "session_id":      "test-session-001",

    # ── One approved prospect with real email ─────────────────────────────
    "approved_prospects": [
        {
            "name":         "Neo",
            "email":        "neo.techagent47@gmail.com",
            "company":      "Bitz and Beyond",
            "linkedin_url": "https://linkedin.com/in/neo",
        }
    ],

    # ── Minimal email sequence matching generate_email_node output ────────
    "drafted_variants": {
        "email_sequence": {
            "variants": [
                {
                    "id":               "A",
                    "angle":            "Reply rate decay",
                    "hypothesis":       "Founders hate manual SDR follow-ups",
                    "signal_reference": "Reply rate decay is top pain point",
                    "touch_1": {
                        "subject": "Quick question for {first_name} at {company}",
                        "body": (
                            "Hi {first_name},\n\n"
                            "I saw {company} is scaling fast. "
                            "Most CTOs at your stage tell us their biggest SDR pain "
                            "is reply rates dropping off after week 2.\n\n"
                            "We built ComplyOps to fix exactly that — "
                            "automated SOC2 compliance so your team spends time "
                            "closing, not chasing paperwork.\n\n"
                            "Worth a 15 min chat this week?"
                        ),
                        "cta": "Book a slot here →",
                    },
                    "touch_2": {
                        "subject": "Re: Following up",
                        "body":    "Hi {first_name}, just bumping this up — did my last email land at a bad time?",
                        "cta":     "Reply to this email",
                    },
                    "touch_3": {
                        "subject": "Leaving this here",
                        "body":    "Hi {first_name}, last note from me — my calendar is always open if timing ever works.",
                        "cta":     "Book here →",
                    },
                },
                {
                    "id":               "B",
                    "angle":            "Competitor gap",
                    "hypothesis":       "Vanta is too expensive for early stage",
                    "signal_reference": "Vanta pricing cited as barrier in G2 reviews",
                    "touch_1": {
                        "subject": "{first_name} — the Vanta alternative built for {company}'s stage",
                        "body": (
                            "Hi {first_name},\n\n"
                            "If you've looked at Vanta and thought 'too much for where we are' — "
                            "you're not alone. Most Seed/Series A teams tell us the same.\n\n"
                            "ComplyOps gets you SOC2 ready in 6 weeks at a fraction of the cost. "
                            "No consultants, no manual evidence collection.\n\n"
                            "Happy to show you a 10 min demo?"
                        ),
                        "cta": "Book demo →",
                    },
                    "touch_2": {
                        "subject": "Re: Quick follow up",
                        "body":    "Hi {first_name}, just checking — did the last email resonate at all?",
                        "cta":     "Reply here",
                    },
                    "touch_3": {
                        "subject": "Last note",
                        "body":    "Hi {first_name}, I'll leave this as my last note. Wishing {company} the best.",
                        "cta":     "Book here →",
                    },
                },
            ]
        }
    },

    # ── Empty fields so node doesn't crash ────────────────────────────────
    "outreach_status":    [],
    "outreach_summary":   {},
    "pending_prospects":  [],
    "conversation_history": [],
    "next_action":        "",
    "tool_input":         {},
    "_loop_count":        0,
    "response_text":      "",
    "thinking":           "",
    "summary":            "",
    "top_opportunities":  [],
    "top_risks":          [],
    "drafted_variants":   {
        "email_sequence": {
            "variants": [
                {
                    "id":    "A",
                    "angle": "Reply rate decay",
                    "touch_1": {
                        "subject": "Quick question for {first_name} at {company}",
                        "body":    "Hi {first_name}, scaling {company} fast? Let's chat.",
                        "cta":     "Book here →",
                    },
                }
            ]
        }
    },
    "confirmed_hypotheses": [],
    "failed_angles":        [],
    "cycle_memory":         [],
    "last_generated":       "",
    "last_refined":         "",
    "campaign_launched":    False,
    "requires_human_approval": False,
}


async def main():
    # ── 1. Boot DB pool ───────────────────────────────────────────────────
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
    logger.info("✅ DB pool ready")

    # ── 2. Call launch_campaign_node directly ─────────────────────────────
    from agents.nodes.nodes import launch_campaign_node

    logger.info("🚀 Calling launch_campaign_node...")
    result_state = await launch_campaign_node(FAKE_STATE)

    logger.info("response_text: %s", result_state.get("response_text"))
    logger.info("outreach_status: %s", result_state.get("outreach_status"))

    queued = result_state.get("outreach_status", [])
    assert len(queued) == 1, f"Expected 1 queued, got {len(queued)}"
    assert queued[0]["email"] == "neo.techagent47@gmail.com"
    logger.info("✅ launch_campaign_node queued correctly")

    # ── 3. Call send_email_task directly (bypass Redis) ───────────────────
    from src.workers.email.email_tasks import send_email_task
    from src.db.outreach import get_campaign_stats

    # Get the row_id that was inserted by launch_campaign_node
    row_id = queued[0].get("row_id")
    if not row_id:
        logger.warning("⚠️  No row_id in outreach_status — checking DB directly")

    # Build payload matching what launch_campaign_node pushed to Redis
    payload = {
        "campaign_id":   "test-launch-001",
        "email":         "neo.techagent47@gmail.com",
        "prospect_name": "Neo",
        "company":       "Bitz and Beyond",
        "variant_used":  "A",
        "row_id":        row_id,
        "touch": {
            "subject": "Quick question for Neo at Bitz and Beyond",
            "body":    "Hi Neo, scaling Bitz and Beyond fast? Let's chat.",
            "cta":     "Book here →",
        },
    }

    logger.info("📧 Calling send_email_task directly...")
    send_result = await send_email_task({}, payload)
    logger.info("send_email_task result: %s", send_result)

    assert send_result.get("success"), f"Send failed: {send_result}"
    logger.info("✅ Email sent — resend_id: %s", send_result.get("resend_id"))

    # ── 4. Verify DB state ────────────────────────────────────────────────
    stats = await get_campaign_stats("test-launch-001")
    logger.info("Campaign stats: %s", stats)

    assert stats.get("sent", 0) >= 1, f"Expected sent >= 1, got {stats}"
    logger.info("✅ PASS — DB shows sent. Check pgAdmin + neo.techagent47@gmail.com inbox.")

    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())