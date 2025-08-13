import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # API 配置
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RealTime Avatar API"

    # OpenAI 配置
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = "gpt-3.5-turbo"

    # Edge TTS 配置
    EDGE_TTS_VOICE: str = "zh-TW-HsiaoChenNeural"  # 台灣中文女聲

    # 雲端儲存配置
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")  # local, s3, gcs

    # AWS S3 配置
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-northeast-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "")

    # Google Cloud Storage 配置
    GCS_BUCKET_NAME: str = os.getenv("GCS_BUCKET_NAME", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS", ""
    )

    # 本地儲存配置
    LOCAL_STORAGE_PATH: str = "uploads"
    BACKEND_PUBLIC_URL: str = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")

    # Rhubarb Lip Sync 配置
    RHUBARB_PATH: str = os.getenv("RHUBARB_PATH", "rhubarb")  # 命令列工具路徑

    class Config:
        env_file = ".env"


settings = Settings()
