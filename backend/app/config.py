from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://consulting:consulting@localhost:5432/consulting"
    JWT_SECRET: str = "dev-only-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:5173"
    ALLOW_SEED: bool = False
    RATE_LIMIT_PER_MINUTE: int = 120
    LOG_LEVEL: str = "info"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
