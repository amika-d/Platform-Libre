"""
db/hypotheses.py
Writes confirmed hypotheses to campaign_memory table.
"""
import logging
from src.db.database import get_pool

logger = logging.getLogger(__name__)


async def save_hypothesis(data: dict) -> None:
    """
    Insert a confirmed learning into campaign_memory.
    data comes from process_feedback_node LLM result + computed metrics.
    """
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO campaign_memory (
                    campaign_id, cycle_number,
                    hypothesis, confirmed, confidence,
                    failed_angle, segment, best_channel,
                    rule_for_next_cycle,
                    variant_a_open_rate, variant_a_reply_rate, variant_a_meetings,
                    variant_b_open_rate, variant_b_reply_rate, variant_b_meetings,
                    winner
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s
                )
                """,
                (
                    data.get("campaign_id", ""),
                    data.get("cycle_number", 1),
                    data.get("hypothesis", ""),
                    data.get("confirmed", True),
                    data.get("confidence", "medium"),
                    data.get("failed_angle", ""),
                    data.get("segment", ""),
                    data.get("best_channel", "email"),
                    data.get("rule_for_next_cycle", ""),
                    data.get("variant_a_open_rate", 0),
                    data.get("variant_a_reply_rate", 0),
                    data.get("variant_a_meetings", 0),
                    data.get("variant_b_open_rate", 0),
                    data.get("variant_b_reply_rate", 0),
                    data.get("variant_b_meetings", 0),
                    data.get("winner", "neither"),
                ),
            )
    logger.info(
        "💾 save_hypothesis | campaign=%s cycle=%s hypothesis=%s",
        data.get("campaign_id"), data.get("cycle_number"), data.get("hypothesis", "")[:80]
    )


async def get_hypotheses(campaign_id: str) -> list[dict]:
    """
    Load all confirmed hypotheses for a campaign ordered by cycle.
    Used by supervisor to sharpen cycle N+1 research.
    """
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT cycle_number, hypothesis, confidence,
                       failed_angle, rule_for_next_cycle, best_channel
                  FROM campaign_memory
                 WHERE campaign_id = %s
                   AND confirmed = true
                 ORDER BY cycle_number ASC
                """,
                (campaign_id,),
            )
            cols = [d.name for d in cur.description]
            rows = await cur.fetchall()

    result = [dict(zip(cols, row)) for row in rows]
    logger.info("📚 get_hypotheses | campaign=%s → %s records", campaign_id, len(result))
    return result