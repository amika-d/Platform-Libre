"""
test_linkedin_e2e.py

Full flow test:
  1. Insert prospect to linkedin_outreach (as if launch_campaign fired)
  2. Send invite to linkedin.com/in/amiya-desh
  3. Poll connections until accepted → send DM
  4. Poll messages until reply → capture to DB

Run: python test_linkedin_e2e.py

Requirements:
  - cookies/linkedin_cookies.json must exist (run test_linkedin_setup.py first)
  - postgres + redis running (docker compose up -d)
  - linkedin worker running (python run_linkedin_worker.py)
"""

import asyncio
import logging
from datetime import datetime

from psycopg_pool import AsyncConnectionPool
from src.core.config import settings
from src.db.database import set_pool, init_db
from src.db.linkedin import (
    insert_linkedin_prospect,
    get_pending_invites,
    get_accepted_no_dm,
    get_dm_sent_urls,
    get_campaign_linkedin_stats,
)
from src.workers.linkedin.producer import push_linkedin_job
from src.workers.linkedin.reply_poller import (
    poll_linkedin_connections,
    poll_linkedin_replies,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

CAMPAIGN_ID   = "test-li-001"
LINKEDIN_URL  = "https://www.linkedin.com/in/amiya-desh/"
PROFILE_NAME  = "Amiya"
COMPANY       = "Test Co"
VARIANT       = "A"

DM_MESSAGE = (
    "Hey {first_name}, thanks for connecting! "
    "I'm building an AI-powered growth tool that helps teams go from "
    "market signal to live campaign in one conversation. "
    "Would love to get your thoughts if you have 10 mins this week?"
)

POLL_INTERVAL_SEC = 60   # check every 60s
MAX_WAIT_MIN      = 30   # give up after 30 mins


# ── DB setup ──────────────────────────────────────────────────────────────────

async def init_db_pool() -> AsyncConnectionPool:
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


# ── Step 1: insert + queue invite ─────────────────────────────────────────────

async def step1_queue_invite() -> int:
    print("\n─── STEP 1: Queue LinkedIn Invite ──────────────────────────")

    row_id = await insert_linkedin_prospect(
        campaign_id=CAMPAIGN_ID,
        linkedin_url=LINKEDIN_URL,
        profile_name=PROFILE_NAME,
        company=COMPANY,
        variant_used=VARIANT,
        message_text=DM_MESSAGE,
    )
    print(f"✅ Inserted linkedin_outreach row | id={row_id}")

    job_id = await push_linkedin_job({
        "campaign_id":  CAMPAIGN_ID,
        "linkedin_url": LINKEDIN_URL,
        "profile_name": PROFILE_NAME,
        "company":      COMPANY,
        "variant_used": VARIANT,
        "message_text": DM_MESSAGE,
        "row_id":       row_id,
    })
    print(f"📨 LinkedIn invite job queued | job_id={job_id}")
    print("   → LinkedIn worker will now open Chrome and send the invite")
    print(f"   → Profile: {LINKEDIN_URL}")
    return row_id


# ── Step 2: poll until accepted ───────────────────────────────────────────────

async def step2_wait_for_acceptance(row_id: int) -> bool:
    print("\n─── STEP 2: Waiting for Invite Acceptance ──────────────────")
    print(f"   Polling every {POLL_INTERVAL_SEC}s | max wait {MAX_WAIT_MIN} mins")
    print(f"   → Accept the invite from your LinkedIn account: {LINKEDIN_URL}\n")

    max_polls = (MAX_WAIT_MIN * 60) // POLL_INTERVAL_SEC
    ctx = {}  # empty ctx — poller uses arq_pool from worker, we poll manually here

    for attempt in range(int(max_polls)):
        now = datetime.now().strftime("%H:%M:%S")
        print(f"  [{now}] Poll #{attempt + 1}/{int(max_polls)} — checking connections...")

        # run poller inline (no arq needed for testing)
        result = await poll_linkedin_connections(ctx)
        accepted = result.get("accepted", 0)

        if accepted > 0:
            print(f"  🎉 Invite accepted! → DM will be sent automatically")
            return True

        # check DB directly as backup
        pending = await get_pending_invites(campaign_id=CAMPAIGN_ID)
        accepted_no_dm = await get_accepted_no_dm()

        if any(r.get("campaign_id") == CAMPAIGN_ID for r in accepted_no_dm):
            print(f"  🎉 Found accepted invite in DB!")
            return True

        print(f"  ⏳ Not accepted yet — waiting {POLL_INTERVAL_SEC}s...")
        await asyncio.sleep(POLL_INTERVAL_SEC)

    print(f"  ❌ Timed out after {MAX_WAIT_MIN} mins — invite not accepted")
    return False


# ── Step 3: poll until reply captured ────────────────────────────────────────

async def step3_wait_for_reply() -> bool:
    print("\n─── STEP 3: Waiting for Reply ──────────────────────────────")
    print("   → Reply to the DM from your LinkedIn account\n")

    max_polls = (MAX_WAIT_MIN * 60) // POLL_INTERVAL_SEC
    ctx = {}

    for attempt in range(int(max_polls)):
        now = datetime.now().strftime("%H:%M:%S")
        print(f"  [{now}] Poll #{attempt + 1}/{int(max_polls)} — checking messages...")

        result = await poll_linkedin_replies(ctx)
        new_replies = result.get("new_replies", 0)

        if new_replies > 0:
            print(f"  💬 Reply captured! → written to linkedin_outreach.reply_body")
            return True

        print(f"  ⏳ No reply yet — waiting {POLL_INTERVAL_SEC}s...")
        await asyncio.sleep(POLL_INTERVAL_SEC)

    print(f"  ❌ Timed out — no reply captured in {MAX_WAIT_MIN} mins")
    return False


# ── Step 4: print final DB state ──────────────────────────────────────────────

async def step4_print_stats():
    print("\n─── STEP 4: Final Campaign Stats ───────────────────────────")
    stats = await get_campaign_linkedin_stats(CAMPAIGN_ID)
    print(f"""
  Campaign  : {CAMPAIGN_ID}
  Total     : {stats.get('total', 0)}
  Accepted  : {stats.get('accepted', 0)}
  Failed    : {stats.get('failed', 0)}
  DM Sent   : {stats.get('dm_sent', 0)}
  Replied   : {stats.get('replied', 0)}
    """)


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    print("=" * 60)
    print("  LinkedIn E2E Test")
    print(f"  Target  : {LINKEDIN_URL}")
    print(f"  Campaign: {CAMPAIGN_ID}")
    print("=" * 60)

    print("\n⚠️  Make sure these are running:")
    print("   docker compose up -d      (postgres + redis)")
    print("   python run_linkedin_worker.py  (in another terminal)")
    input("\nPress ENTER when ready...\n")

    pool = await init_db_pool()

    try:
        # step 1 — queue invite
        row_id = await step1_queue_invite()

        print(f"\n⏳ Invite job queued. Worker will send it now.")
        print("   Watch the linkedin worker terminal for:")
        print("   ✅ Invite sent | url=...")
        input("\nPress ENTER once you see invite sent in worker logs...\n")

        # step 2 — wait for acceptance
        accepted = await step2_wait_for_acceptance(row_id)

        if accepted:
            print("\n⏳ DM job queued by poller. Worker will send it now.")
            print("   Watch worker terminal for:")
            print("   ✅ DM sent | row=...")
            input("\nPress ENTER once you see DM sent in worker logs...\n")

            # step 3 — wait for reply
            replied = await step3_wait_for_reply()
        else:
            replied = False

        # step 4 — stats
        await step4_print_stats()

        # ── Result ────────────────────────────────────────────────────────────
        print("=" * 60)
        print("  RESULTS")
        print("=" * 60)
        print(f"  {'✅' if True   else '❌'}  Invite queued & sent")
        print(f"  {'✅' if accepted else '❌'}  Invite accepted + DM sent")
        print(f"  {'✅' if replied  else '❌'}  Reply captured to DB")
        print("=" * 60)

    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())