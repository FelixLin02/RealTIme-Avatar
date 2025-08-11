from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import asyncio

from app.services.avatar_service import AvatarService
from app.services.storage_service import StorageService

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    audio_url: str
    animation_script: dict
    message: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_avatar(request: ChatRequest):
    """
    與虛擬人聊天的主要端點
    
    流程：
    1. 接收使用者文字
    2. 呼叫 LLM 生成回應
    3. 使用 TTS 轉換為語音
    4. 使用 Rhubarb Lip Sync 分析音訊
    5. 回傳音訊 URL 和動畫腳本
    """
    try:
        avatar_service = AvatarService()
        storage_service = StorageService()
        
        # 1. 生成回應文字
        response_text = await avatar_service.generate_response(request.message)
        
        # 2. 轉換為語音
        audio_file_path = await avatar_service.text_to_speech(response_text)
        
        # 3. 分析音訊生成動畫腳本
        animation_script = await avatar_service.analyze_audio(audio_file_path)
        
        # 4. 上傳音訊到雲端儲存
        audio_url = await storage_service.upload_audio(audio_file_path)
        
        return ChatResponse(
            audio_url=audio_url,
            animation_script=animation_script,
            message=response_text
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"處理請求時發生錯誤: {str(e)}")

@router.get("/health")
async def health_check():
    """健康檢查端點"""
    return {"status": "healthy", "service": "avatar-api"}
