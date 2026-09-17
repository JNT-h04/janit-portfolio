"""Settings, read from environment variables or a .env file.

Secrets (API keys) never go in code. You put them in backend/.env, which
git ignores, and this class loads them. On the server you set real
environment variables instead.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # .../backend/app


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "JANIT://SYS API"
    version: str = "0.1.0"
    # Which websites may call this API from a browser (CORS). The Vite dev
    # proxy doesn't need this, but the deployed frontend will.
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    data_dir: Path = BASE_DIR / "data"

    # LEXICON (book summarizer). Get a free key at https://aistudio.google.com/apikey
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"


settings = Settings()
