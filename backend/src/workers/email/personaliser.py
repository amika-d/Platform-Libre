"""
src/workers/email/personaliser.py
Injects prospect-specific data into touch copy.
Supports {name}, {company}, {first_name} placeholders.
"""
from __future__ import annotations
import re


def _first_name(full_name: str) -> str:
    """'Sarah Connor' → 'Sarah'  |  '' → 'there'"""
    parts = full_name.strip().split()
    return parts[0] if parts else "there"


def personalise(template: str, *, name: str, company: str) -> str:
    """
    Replace all placeholders in a template string.

    Supported tokens:
        {name}       → full name,  e.g. "Sarah Connor"
        {first_name} → first name, e.g. "Sarah"
        {company}    → company,    e.g. "Acme Corp"
    """
    first = _first_name(name)
    result = (
        template
        .replace("{name}",         name    or "there")
        .replace("{first_name}",   first   or "there")
        .replace("{company}",      company or "your company")
        .replace("[First Name]",   first   or "there")
        .replace("[Name]",         name    or "there")
        .replace("[Company]",      company or "your company")
        .replace("[Company Name]", company or "your company")
        .replace("{{first_name}}", first   or "there")
        .replace("{{name}}",       name    or "there")
        .replace("{{company}}",    company or "your company")
    )
    return result


def personalise_touch(touch: dict, *, name: str, company: str) -> dict:
    """
    Personalise a touch dict that has 'subject', 'body', 'cta' keys.
    Returns a new dict — original is untouched.

    Example touch structure from generate_email_node:
        {"subject": "...", "body": "...", "cta": "..."}
    """
    return {
        "subject": personalise(touch.get("subject", ""), name=name, company=company),
        "body":    personalise(touch.get("body",    ""), name=name, company=company),
        "cta":     personalise(touch.get("cta",     ""), name=name, company=company),
    }