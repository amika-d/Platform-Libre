"""
src/agents/nodes/launch_campaign_node.py

Routes each approved prospect to:
  - email worker   (Resend)   — if prospect has 'email'
  - linkedin worker (Unipile) — if prospect has 'linkedin_url'
  - both                      — if prospect has both
"""
from __future__ import annotations
import logging

from src.state.agent_state import AgentState
from src.db.outreach import insert_prospect, get_campaign_stats, get_replied_prospects

from src.db.linkedin import insert_linkedin_prospect
from src.workers.email.producer import push_email_job
from src.workers.linkedin.producer import push_linkedin_job
from src.workers.email.personaliser import personalise, personalise_touch

logger = logging.getLogger(__name__)

async def launch_campaign_node(state: AgentState) -> AgentState:
    print("--- NODE: launch_campaign ---")

    approved    = state.get("approved_prospects", [])
    cycle = state.get("cycle_number", 1)

    if cycle > 1:
        replied = await get_replied_prospects(campaign_id, cycle - 1)
        approved = [
            {
                "name":    r["prospect_name"],
                "email":   r["email"],
                "company": r["company"],
            }
            for r in replied
        ]
        if not approved:
            return {**state, "response_text": f"No replied prospects from cycle {cycle - 1} to target."}
    else:
        approved = state.get("approved_prospects", [])
    variants    = state.get("drafted_variants", {})
    campaign_id = state.get("campaign_id", "")

    if not approved:
        return {**state, "response_text": "No approved prospects. Find and approve prospects first."}

    email_seq      = variants.get("email_sequence", {})
    email_variants = email_seq.get("variants", [])

    linkedin_seq      = variants.get("linkedin_sequence", {})
    linkedin_variants = linkedin_seq.get("variants", [])

    if not linkedin_variants and email_variants:
        linkedin_variants = email_variants

    if not email_variants and not linkedin_variants:
        return {**state, "response_text": "No sequences generated. Generate content first."}

    already_sent_emails = {
        s.get("email") for s in state.get("outreach_status", [])
        if s.get("status") not in ("queued", "pending")
    }

    queued  = []
    skipped = []
    errors  = []

    for i, prospect in enumerate(approved):
        name         = prospect.get("name", "")
        email        = prospect.get("email", "")
        linkedin_url = prospect.get("linkedin_url", "")
        company      = prospect.get("company", "")

        # normalise linkedin_url
        if linkedin_url.startswith("https://linkedin.com/"):
            linkedin_url = linkedin_url.replace(
                "https://linkedin.com/", "https://www.linkedin.com/"
            )

        if not email and not linkedin_url:
            skipped.append({"name": name, "reason": "no email or linkedin_url"})
            continue

        variant_idx = i % max(len(email_variants), 1)

        # ── EMAIL via Resend ──────────────────────────────────────────────────
        if email:
            if email in already_sent_emails:
                skipped.append({"name": name, "reason": "email already contacted"})
            elif not email_variants:
                skipped.append({"name": name, "reason": "no email variants drafted"})
            else:
                try:
                    variant    = email_variants[variant_idx % len(email_variants)]
                    variant_id = variant.get("id", "A")
                    raw_touch  = variant.get("touch_1", {})
                    touch      = personalise_touch(raw_touch, name=name, company=company)

                    row_id = await insert_prospect(
                        campaign_id=campaign_id,
                        email=email,
                        prospect_name=name,
                        company=company,
                        variant_used=variant_id,
                        touch_number=1,
                        cycle_number_campaign=cycle,
                    )

                    job_id = await push_email_job({
                        "campaign_id":   campaign_id,
                        "email":         email,
                        "prospect_name": name,
                        "company":       company,
                        "variant_used":  variant_id,
                        "touch":         touch,
                        "row_id":        row_id,
                    })

                    queued.append({"name": name, "channel": "email", "target": email, "variant": variant_id, "job_id": job_id, "status": "queued"})
                    logger.info("✅ email queued | %s → %s", name, email)

                except Exception as exc:
                    logger.error("❌ email failed | %s err=%s", email, exc)
                    errors.append({"name": name, "channel": "email", "error": str(exc)})

        # ── LINKEDIN via Unipile ──────────────────────────────────────────────
        if linkedin_url:
            if not linkedin_variants:
                skipped.append({"name": name, "reason": "no linkedin variants drafted"})
            else:
                try:
                    li_variant    = linkedin_variants[variant_idx % len(linkedin_variants)]
                    li_variant_id = li_variant.get("id", "A")

                    raw_dm  = li_variant.get("linkedin_dm") or li_variant.get("touch_1", {})
                    dm_text = raw_dm.get("body", "") if isinstance(raw_dm, dict) else str(raw_dm)
                    dm_text = personalise(dm_text, name=name, company=company)

                    li_row_id = await insert_linkedin_prospect(
                        campaign_id=campaign_id,
                        linkedin_url=linkedin_url,
                        profile_name=name,
                        company=company,
                        variant_used=li_variant_id,
                        message_text=dm_text,
                        outreach_id=row_id if email else None,
                    )

                    li_job_id = await push_linkedin_job({
                        "campaign_id":  campaign_id,
                        "linkedin_url": linkedin_url,
                        "profile_name": name,
                        "company":      company,
                        "variant_used": li_variant_id,
                        "message_text": dm_text,
                        "row_id":       li_row_id,
                    })

                    queued.append({"name": name, "channel": "linkedin", "target": linkedin_url, "variant": li_variant_id, "job_id": li_job_id, "status": "queued"})
                    logger.info("✅ linkedin queued | %s → %s", name, linkedin_url)

                except Exception as exc:
                    logger.error("❌ linkedin failed | %s err=%s", linkedin_url, exc)
                    errors.append({"name": name, "channel": "linkedin", "error": str(exc)})

    email_count    = sum(1 for q in queued if q["channel"] == "email")
    linkedin_count = sum(1 for q in queued if q["channel"] == "linkedin")
    a_count        = sum(1 for q in queued if q["variant"] == "A")
    b_count        = sum(1 for q in queued if q["variant"] == "B")

    parts = [f"Campaign launched — {len(queued)} jobs queued."]
    if email_count:    parts.append(f"Email: {email_count}")
    if linkedin_count: parts.append(f"LinkedIn: {linkedin_count}")
    if a_count:        parts.append(f"Variant A: {a_count}")
    if b_count:        parts.append(f"Variant B: {b_count}")
    if skipped:        parts.append(f"Skipped: {len(skipped)}")
    if errors:         parts.append(f"Errors: {len(errors)}")

    return {
        **state,
        "outreach_status":   queued,
        "campaign_launched": True,
        "response_text":     " | ".join(parts),
    }