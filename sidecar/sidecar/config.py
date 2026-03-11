"""
Application settings via pydantic-settings (environment variables).
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Sidecar configuration loaded from environment variables.

    All fields are populated from environment variables prefixed with
    ``SIDECAR_``.

    Attributes
    ----------
    host : str
        Server bind address, by default ``"0.0.0.0"``.
    port : int
        Server port, by default 8000.
    cors_origins : str
        Comma-separated CORS origins, by default ``"http://localhost:3000"``.
    layers_api_url : str
        Layers appview URL (for future use), by default ``"http://localhost:3001"``.
    nltk_data_dir : str or None
        NLTK data directory, by default None (uses ``~/nltk_data``).
    unimorph_cache_dir : str
        UniMorph cache directory, by default ``"/tmp/unimorph_cache"``.
    mlm_model_name : str
        HuggingFace masked language model name, by default ``"bert-base-uncased"``.
    """

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
        """
        Parse comma-separated CORS origins into a list.

        Returns
        -------
        list[str]
            Individual origin strings with whitespace stripped.
        """
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
