# src/agents/outreach/live_outreach_nodes.py
from src.state.agent_state import AgentState
from src.db.outreach import insert_prospect, mark_sent, mark_error, get_campaign_stats
import smtplib
from email.message import EmailMessage
from src.core.config import settings

async def send_outreach_email_node(state: AgentState) -> AgentState:
    print("--- NODE: send_outreach_email ---")
    tool_input = state.get("tool_input", {})
    target_email = tool_input.get("target_email")
    variant_id = tool_input.get("variant_id")
    
    if not target_email or not variant_id:
        return {**state, "response_text": "Error: missing target_email or variant_id."}

    variants = state.get("drafted_variants", {}).get("email_sequence", {}).get("variants", [])
    variant = next((v for v in variants if v.get("id") == variant_id), None)
    
    if not variant:
        return {**state, "response_text": f"Error: Variant {variant_id} not found."}

    touch = variant.get("touch_1", {})
    subject = touch.get("subject", "Hello")
    body = touch.get("body", "...")
    
    try:
        # DB insert
        row_id = await insert_prospect(
            campaign_id=state.get("session_id", "test"), 
            email=target_email,
            variant_used=variant_id
        )

        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_pass = getattr(settings, "SMTP_PASSWORD", None)

        # SMTP logic
        if smtp_user and smtp_pass:
            msg = EmailMessage()
            msg.set_content(body)
            msg['Subject'] = subject
            msg['From'] = getattr(settings, "EMAIL_FROM", smtp_user)
            msg['To'] = target_email

            host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
            port = getattr(settings, "SMTP_PORT", 587)
            server = smtplib.SMTP(host, port)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            
            await mark_sent(row_id=row_id, resend_id=f"smtp-{row_id}")
            response_text = f"Successfully sent Variant {variant_id} to {target_email}!"
        else:
            await mark_sent(row_id=row_id, resend_id=f"mock-{row_id}")
            response_text = f"[MOCK] Logged Variant {variant_id} to {target_email} in database (No SMTP setup)."
            
    except Exception as e:
        if 'row_id' in locals():
            await mark_error(row_id=row_id, error_msg=str(e))
        response_text = f"Error sending email: {e}"

    return {**state, "response_text": response_text}

async def check_outreach_status_node(state: AgentState) -> AgentState:
    print("--- NODE: check_outreach_status ---")
    tool_input = state.get("tool_input", {})
    campaign_id = tool_input.get("campaign_id") or state.get("session_id", "test")
    
    try:
        stats = await get_campaign_stats(campaign_id)
        if not stats:
            response_text = f"No outreach recorded for campaign {campaign_id}."
        else:
            response_text = f"Campaign {campaign_id} live stats:\n" + "\n".join(f"- {k}: {v}" for k, v in stats.items())
    except Exception as e:
        response_text = f"Error fetching stats: {e}"

    return {**state, "response_text": response_text}
