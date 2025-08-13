import os
import boto3
import tempfile
from google.cloud import storage
from typing import Optional
from app.core.config import settings


class StorageService:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE

        # 初始化雲端儲存客戶端
        if self.storage_type == "s3":
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
        elif self.storage_type == "gcs":
            self.gcs_client = storage.Client()

        # 確保本地儲存目錄存在
        if self.storage_type == "local":
            os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)

    async def upload_audio(self, local_file_path: str) -> str:
        """
        上傳音訊檔案並回傳可存取的 URL
        """
        try:
            if self.storage_type == "local":
                return await self._upload_to_local(local_file_path)
            elif self.storage_type == "s3":
                return await self._upload_to_s3(local_file_path)
            elif self.storage_type == "gcs":
                return await self._upload_to_gcs(local_file_path)
            else:
                raise ValueError(f"不支援的儲存類型: {self.storage_type}")

        except Exception as e:
            raise Exception(f"上傳音訊檔案時發生錯誤: {str(e)}")

    async def _upload_to_local(self, local_file_path: str) -> str:
        """
        上傳到本地儲存（開發環境用）
        """
        import shutil
        from datetime import datetime

        # 生成檔案名稱
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"audio_{timestamp}.wav"
        destination_path = os.path.join(settings.LOCAL_STORAGE_PATH, filename)

        # 複製檔案
        shutil.copy2(local_file_path, destination_path)

        # 回傳完整本地 URL（供前端直接播放）
        base = settings.BACKEND_PUBLIC_URL.rstrip("/")
        return f"{base}/static/audio/{filename}"

    async def _upload_to_s3(self, local_file_path: str) -> str:
        """
        上傳到 AWS S3
        """
        import uuid

        # 生成唯一的檔案名稱
        file_id = str(uuid.uuid4())
        filename = f"audio/{file_id}.wav"

        # 上傳到 S3
        self.s3_client.upload_file(
            local_file_path,
            settings.S3_BUCKET_NAME,
            filename,
            ExtraArgs={"ContentType": "audio/wav"},
        )

        # 生成公開 URL
        url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{filename}"
        return url

    async def _upload_to_gcs(self, local_file_path: str) -> str:
        """
        上傳到 Google Cloud Storage
        """
        import uuid

        # 生成唯一的檔案名稱
        file_id = str(uuid.uuid4())
        filename = f"audio/{file_id}.wav"

        # 取得 bucket
        bucket = self.gcs_client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(filename)

        # 上傳檔案
        blob.upload_from_filename(local_file_path)

        # 設定公開存取
        blob.make_public()

        # 回傳公開 URL
        return blob.public_url

    async def delete_audio(self, file_url: str) -> bool:
        """
        刪除音訊檔案
        """
        try:
            if self.storage_type == "local":
                return await self._delete_from_local(file_url)
            elif self.storage_type == "s3":
                return await self._delete_from_s3(file_url)
            elif self.storage_type == "gcs":
                return await self._delete_from_gcs(file_url)
            else:
                return False

        except Exception as e:
            print(f"刪除音訊檔案時發生錯誤: {str(e)}")
            return False

    async def _delete_from_local(self, file_url: str) -> bool:
        """
        從本地儲存刪除檔案
        """
        try:
            # 從 URL 提取檔案路徑
            filename = file_url.split("/")[-1]
            file_path = os.path.join(settings.LOCAL_STORAGE_PATH, filename)

            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False

        except Exception:
            return False

    async def _delete_from_s3(self, file_url: str) -> bool:
        """
        從 S3 刪除檔案
        """
        try:
            # 從 URL 提取檔案路徑
            filename = file_url.split(
                f"{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/"
            )[-1]

            self.s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=filename)
            return True

        except Exception:
            return False

    async def _delete_from_gcs(self, file_url: str) -> bool:
        """
        從 GCS 刪除檔案
        """
        try:
            # 從 URL 提取檔案路徑
            filename = file_url.split(
                f"{settings.GCS_BUCKET_NAME}.storage.googleapis.com/"
            )[-1]

            bucket = self.gcs_client.bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(filename)
            blob.delete()

            return True

        except Exception:
            return False
