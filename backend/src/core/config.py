from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENROUTER_API_KEY:  str   = ""
    OPENROUTER_URL:      str   = "https://openrouter.ai/api/v1/chat/completions"
    LLM_MODEL: str = "openrouter/deepseek/deepseek-v3.2"
    SYNTHESIS_MODEL: str = "openrouter/deepseek/deepseek-v3.2"
    VISION_MODEL: str = "openrouter/"

    MAX_TOKENS:          int   = 8192
    TEMPERATURE:         float = 0.0

    TAVILY_API_KEY:      str   = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    EXA_API_KEY : str = ""

    REQUEST_TIMEOUT:     int   = 120
    FIRECRAWL_API_KEY: str = ""
    
    FAL_API_KEY: str = ""
    #FAL_URL: str = "https://fal.run/xai/grok-imagine-image"
    
    # Databases
    POSTGRES_URI: str = ""
    REDIS_URI: str = ""

    # Playwright Settings
    MAX_DAILY_INVITES: int = 20
    LINKEDIN_SESSION_FILE: str = "session.json"
    
    # ---- Email Outreach ------#
    
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str =  ""
    RESEND_WEBHOOK_SECRET: str = ""
    
    HUNTER_API_KEY: str = ""


    UNIPILE_DSN: str = ""        # e.g. https://api1.unipile.com:13465
    UNIPILE_API_KEY: str = ""
    UNIPILE_ACCOUNT_ID: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()