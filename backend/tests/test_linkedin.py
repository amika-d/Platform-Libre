"""
Integration test — full LinkedIn outreach flow. (Standalone Script)

Run:
    python tests/integration/test_linkedin_flow.py
"""
from __future__ import annotations
import asyncio
import os
import httpx
from dotenv import load_dotenv
from psycopg_pool import AsyncConnectionPool

load_dotenv()

from src.db.database import set_pool, get_pool
from src.db.linkedin import insert_linkedin_prospect
from src.workers.linkedin.linkedin_tasks import send_linkedin_invite_task
from src.core.config import settings


# ── config ────────────────────────────────────────────────────────────────────

CAMPAIGN_ID      = "test-campaign-001"
LINKEDIN_URL     = "https://www.linkedin.com/in/amika-d/"
PROFILE_NAME     = "Pamali Rodrigo"
COMPANY          = "Test Co"
DM_TEXT          = "Hey Pamali, thanks for connecting — got 10 mins to chat this week?"
WEBHOOK_BASE_URL = "http://app:8000/v1"   # your FastAPI dev server must be running


# ── helpers ───────────────────────────────────────────────────────────────────

async def _get_row(linkedin_url: str) -> dict | None:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, invite_status, message_status, replied_at,
                       reply_body, message_text, profile_name
                  FROM linkedin_outreach
                 WHERE linkedin_url = %s
                 ORDER BY id DESC LIMIT 1
                """,
                (linkedin_url,),
            )
            row = await cur.fetchone()
            if not row:
                return None
            cols = ["id", "invite_status", "message_status", "replied_at",
                    "reply_body", "message_text", "profile_name"]
            return dict(zip(cols, row))


async def _cleanup(linkedin_url: str) -> None:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM linkedin_outreach WHERE linkedin_url = %s",
                (linkedin_url,),
            )


# ── main execution flow ───────────────────────────────────────────────────────

async def run_linkedin_flow():
    # ── step 1: clean slate ───────────────────────────────────────────────────
    await _cleanup(LINKEDIN_URL)

    # ── step 2: insert row ────────────────────────────────────────────────────
    row_id = await insert_linkedin_prospect(
        campaign_id=CAMPAIGN_ID,
        linkedin_url=LINKEDIN_URL,
        profile_name=PROFILE_NAME,
        company=COMPANY,
        variant_used="A",
        message_text=DM_TEXT,
    )
    print(f"\n✅ inserted row_id={row_id}")

    # ── step 3: run invite task directly (hits real Unipile) ──────────────────
    result = await send_linkedin_invite_task(
        ctx={},
        payload={
            "campaign_id":  CAMPAIGN_ID,
            "linkedin_url": LINKEDIN_URL,
            "profile_name": PROFILE_NAME,
            "company":      COMPANY,
            "variant_used": "A",
            "message_text": DM_TEXT,
            "row_id":       row_id,
        },
    )
    print(f"📤 invite task result: {result}")
    assert result["success"], f"invite failed: {result}"

    # ── step 4: verify row exists in DB ───────────────────────────────────────
    row = await _get_row(LINKEDIN_URL)
    assert row is not None
    assert row["invite_status"] == "pending"
    print(f"📋 DB row after invite: {row}")

    # ── step 5: YOU accept the invite on pamali-rodrigo-42a181209 account ───────────────────
    print("\n" + "="*60)
    print("👉 Go accept the LinkedIn invite on the pamali-rodrigo-42a181209 account now.")
    print("   Then press Enter to continue...")
    print("="*60)
    input()

    # ── step 6: fire new_relation webhook ─────────────────────────────────────
    # get provider_id from Unipile for pamali-rodrigo-42a181209
    slug = "pamali-rodrigo-42a181209"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{settings.UNIPILE_DSN}/api/v1/users/{slug}",
            headers={
                "X-API-KEY": settings.UNIPILE_API_KEY,
                "accept": "application/json",
            },
            params={"account_id": settings.UNIPILE_ACCOUNT_ID},
        )
        resp.raise_for_status()
        provider_id = resp.json()["provider_id"]
        print(f"🔑 provider_id for pamali-rodrigo-42a181209: {provider_id}")

    webhook_payload = {
        "event":                  "new_relation",
        "account_id":             settings.UNIPILE_ACCOUNT_ID,
        "account_type":           "LINKEDIN",
        "user_full_name":         PROFILE_NAME,
        "user_provider_id":       provider_id,
        "user_public_identifier": slug,
        "user_profile_url":       LINKEDIN_URL,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{WEBHOOK_BASE_URL}/webhooks/unipile-new-relation",
            json=webhook_payload,
        )
        resp.raise_for_status()
        print(f"🔔 webhook response: {resp.json()}")
        
    # ── step 7: assert accepted + DM sent ─────────────────────────────────────
    await asyncio.sleep(2)  # give DB a moment
    row = await _get_row(LINKEDIN_URL)
    print(f"📋 DB row after accept webhook: {row}")
    assert row["invite_status"]  == "accepted", f"expected accepted got {row['invite_status']}"
    assert row["message_status"] == "sent",     f"expected sent got {row['message_status']}"
    print("✅ invite accepted + DM sent confirmed in DB")

    # ── step 8: YOU reply to the DM on pamali-rodrigo-42a181209 ─────────────────────────────
    print("\n" + "="*60)
    print("👉 Reply to the DM from the pamali-rodrigo-42a181209 LinkedIn account now.")
    print("   Then press Enter to continue...")
    print("="*60)
    input()

    # ── step 9: fire new_message webhook ──────────────────────────────────────
    message_webhook_payload = {
        "event":      "new_message",
        "account_id": settings.UNIPILE_ACCOUNT_ID,
        "chat_id":    "test-chat-123",
        "message_id": "test-msg-456",
        "sender_id":  provider_id,   # NOT our account — inbound
        "text":       "Hey, yes I'd love to chat!",
        "attendee": {
            "public_identifier": slug,
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        # Note: Added /v1 to match the new_relation route convention above if needed,
        # but leaving as it was in your original code: /webhooks/unipile-new-message
        resp = await client.post(
            f"{WEBHOOK_BASE_URL}/webhooks/unipile-new-message",
            json=message_webhook_payload,
        )
        resp.raise_for_status()
        print(f"🔔 message webhook response: {resp.json()}")

    # ── step 10: assert replied ───────────────────────────────────────────────
    await asyncio.sleep(2)
    row = await _get_row(LINKEDIN_URL)
    print(f"📋 DB row after reply webhook: {row}")
    assert row["replied_at"]  is not None, "replied_at not set"
    assert row["reply_body"]  == "Hey, yes I'd love to chat!"
    print("✅ reply confirmed in DB")
    print("\n🎉 Full LinkedIn flow test passed!")


async def main():
    # Setup DB Pool (Replacing the pytest fixture)
    pool = AsyncConnectionPool(
        conninfo=settings.POSTGRES_URI,
        min_size=1,
        max_size=3,
        kwargs={"autocommit": True},
        open=False,
    )
    await pool.open()
    set_pool(pool)

    try:
        # Run the actual test logic
        await run_linkedin_flow()
    finally:
        # Teardown DB Pool
        await pool.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except AssertionError as e:
        print(f"\n❌ Test Failed! {e}")
    except KeyboardInterrupt:
        print("\n🛑 Test aborted by user.")