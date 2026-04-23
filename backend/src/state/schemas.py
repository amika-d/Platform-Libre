from pydantic import BaseModel, Field

class MapPosition(BaseModel):
    x: float = Field(..., description="Automation level 0 to 1")
    y: float = Field(..., description="Market focus 0 to 1 (SMB to Enterprise)")
    label: str
    color: str

class CompetitorOutput(BaseModel):
    name: str
    automation_score: float
    market_focus: float
    positioning_summary: str
    map_position: MapPosition
