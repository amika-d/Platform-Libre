from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


# ── Email Variants (1-3 sequences) ────────────────────────────────────────────

class EmailVariant(BaseModel):
    id: str = Field(description="A, B, or C")
    angle: str = Field(description="e.g., Intent-led, Efficiency, Competitor-gap")
    hypothesis: str = Field(description="What this variant is testing")
    signal_reference: str = Field(description="VERBATIM finding from research")
    touch_1: Dict[str, str] = Field(description="subject, body, cta")
    touch_2: Dict[str, str] = Field(description="subject, body, cta")
    touch_3: Dict[str, str] = Field(description="subject, body, cta")


class EmailSequenceOutput(BaseModel):
    variants: List[EmailVariant] = Field(description="1-3 email variants")


# ── LinkedIn Posts (1-3 posts) ────────────────────────────────────────────────

class LinkedInPost(BaseModel):
    id: str = Field(description="A, B, or C")
    angle: str = Field(description="Different positioning angle")
    hypothesis: str = Field(description="What this post tests")
    signal_reference: str = Field(description="VERBATIM quote from research")
    hook: str = Field(description="First line — stops the scroll")
    body: str = Field(description="Main content, max 150 words")
    cta: str = Field(description="Call to action")
    hashtags: List[str]
    image_prompt: str = Field(description="Detailed FAL.ai image prompt")
    image_url: Optional[str] = Field(default=None, description="Generated image URL")


class LinkedInPostsOutput(BaseModel):
    posts: List[LinkedInPost] = Field(description="1-3 LinkedIn posts with different angles")


# ── Battle Card ───────────────────────────────────────────────────────────────

class BattleCard(BaseModel):
    signal_reference: str = Field(description="VERBATIM research finding justifying this comparison")
    us_label: str
    them_label: str
    us_points: List[str] = Field(description="3-4 specific advantages from research")
    them_points: List[str] = Field(description="3-4 specific weaknesses from research")
    gap_statement: str = Field(description="The unoccupied positioning gap")
    key_differentiator: str = Field(description="Single most important difference")


# ── Flyer ─────────────────────────────────────────────────────────────────────

class Flyer(BaseModel):
    signal_reference: str = Field(description="VERBATIM research finding driving this flyer")
    headline: str = Field(description="Bold headline, max 8 words")
    subheadline: str = Field(description="Supporting line, max 15 words")
    bullet_points: List[str] = Field(description="3-4 specific value points from research")
    social_proof: str = Field(description="Stat or finding from research")
    cta: str = Field(description="Clear call to action")
    image_prompt: str = Field(description="Detailed FAL.ai prompt — dark B2B aesthetic")
    image_url: Optional[str] = Field(default=None, description="Generated image URL")


# ── Infographic (Conditional) ─────────────────────────────────────────────────

class InfographicProps(BaseModel):
    title: str
    insight: str = Field(description="Core finding driving this infographic")
    signal_reference: str = Field(description="VERBATIM research finding")
    data_points: List[Dict[str, Any]] = Field(description="Comparison data (us vs them, or timeline)")
    chart_type: str = Field(description="bar_comparison, funnel, timeline, or heatmap")
    key_statistic: str = Field(description="The #1 stat that proves the point")


class Infographic(BaseModel):
    artifact_type: str = Field(default="Infographic", description="Always 'Infographic'")
    title: str
    signal_reference: str
    component_props: InfographicProps


# ── Legacy: Non-Nodal Output (for backwards compatibility) ──────────────────

class OutreachVariant(BaseModel):
    """Legacy structure when combining email + LinkedIn in one variant."""
    id: str = Field(description="A or B")
    angle: str = Field(description="Overall positioning angle")
    hypothesis: str = Field(description="What this variant tests")
    signal_reference: str = Field(description="VERBATIM research finding")
    
    email_subject: str
    email_body: str
    email_cta: str
    
    linkedin_message: str
    linkedin_cta: str
    
    call_script_hook: str = Field(description="First 10 seconds of cold call")
    objection_handler: str = Field(description="Most likely objection and response")


class SocialPost(BaseModel):
    """Legacy structure for social content."""
    platform: str = Field(description="LinkedIn, Twitter, or other")
    angle: str
    signal_reference: str
    hook: str = Field(description="First line — stops scroll")
    body: str
    cta: str


class BattleCardProps(BaseModel):
    """Legacy battle card structure."""
    us_label: str
    them_label: str
    us_points: List[str]
    them_points: List[str]
    gap_statement: str
    signal_reference: str


class FlyerProps(BaseModel):
    """Legacy flyer structure."""
    headline: str
    subheadline: str
    bullet_points: List[str]
    cta: str
    signal_reference: str
    image_prompt: str


class VisualArtifact(BaseModel):
    """Legacy artifact wrapper."""
    artifact_type: str = Field(description="BattleCard, Infographic, or Flyer")
    title: str
    signal_reference: str
    component_props: Dict[str, Any]


class CampaignBrief(BaseModel):
    """Campaign-level context."""
    product: str
    target_segment: str
    core_narrative: str
    primary_angle: str
    competitor_weaknesses: List[str]
    audience_language: List[str] = Field(
        description="Exact phrases from research that resonate with this segment"
    )
    avoid_angles: List[str] = Field(
        description="Confirmed ineffective angles from cycle_memory"
    )


class GeneratorOutput(BaseModel):
    """
    Legacy monolithic output structure (from generator_agent).
    Now we use individual nodes instead, but keeping for backwards compatibility.
    """
    brief: CampaignBrief
    variants: List[OutreachVariant] = Field(
        description="1-3 variants, each testing different hypothesis"
    )
    social_posts: List[SocialPost] = Field(
        description="Social content posts"
    )
    artifacts: List[VisualArtifact] = Field(
        description="BattleCard, Infographic, Flyer"
    )