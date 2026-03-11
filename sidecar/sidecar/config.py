"""Application settings via pydantic-settings (environment variables)."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Sidecar configuration loaded from environment variables."""

    model_config = {"env_prefix": "SIDECAR_"}

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Layers appview URL (for future use, not required at startup)
    layers_api_url: str = "http://localhost:3001"

    # NLTK data directory (defaults to ~/nltk_data)
    nltk_data_dir: str | None = None

    # UniMorph cache directory
    unimorph_cache_dir: str = "/tmp/unimorph_cache"

    # MLM model name (optional, requires [ml] extras)
    mlm_model_name: str = "bert-base-uncased"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
