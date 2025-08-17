import asyncio
import os
import tempfile
import json
import subprocess
from typing import Dict, Any
import edge_tts
import openai
from gtts import gTTS
from app.core.config import settings


class AvatarService:
    def __init__(self):
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.tts_voice = settings.EDGE_TTS_VOICE
        # 直接硬編碼 Rhubarb 路徑，避免配置問題
        self.rhubarb_path = "/usr/local/bin/rhubarb"

    async def generate_response(self, user_message: str) -> str:
        """
        使用 OpenAI GPT 生成回應文字
        """
        try:
            system_prompt = """你是一個友善的健康陪跑虛擬人。你的角色是：
            1. 鼓勵使用者保持健康的生活方式
            2. 提供運動建議和健康知識
            3. 用溫暖、積極的語氣回應
            4. 回應要簡潔，適合語音播放（30-50字）
            5. 使用繁體中文回應
            """

            response = await self.openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=100,
                temperature=0.7,
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"生成回應時發生錯誤: {str(e)}")  # 添加日誌
            print(f"錯誤類型: {type(e).__name__}")  # 添加錯誤類型
            raise Exception(f"生成回應時發生錯誤: {str(e)}")

    async def text_to_speech(self, text: str) -> str:
        """
        使用 Edge TTS 將文字轉換為語音，失敗時自動切換到離線 TTS
        回傳本地音訊檔案路徑
        """
        # 首先嘗試 Edge TTS
        try:
            print("嘗試使用 Edge TTS...")
            return await self._edge_tts(text)
        except Exception as e:
            print(f"Edge TTS 失敗: {str(e)}")
            print("切換到離線 TTS 備援...")

            # 使用離線 TTS 備援
            try:
                return await self._offline_tts(text)
            except Exception as offline_error:
                print(f"離線 TTS 也失敗: {str(offline_error)}")
                raise Exception(
                    f"所有 TTS 服務都失敗: Edge TTS ({str(e)}), 離線 TTS ({str(offline_error)})"
                )

    async def _edge_tts(self, text: str) -> str:
        """使用 Edge TTS 生成語音"""
        max_retries = 3
        retry_delay = 2  # 初始延遲秒數

        for attempt in range(max_retries):
            try:
                print(f"Edge TTS 嘗試 {attempt + 1}/{max_retries}")

                # 建立臨時檔案
                with tempfile.NamedTemporaryFile(
                    suffix=".wav", delete=False
                ) as temp_file:
                    temp_path = temp_file.name

                # 使用 Edge TTS 生成語音（預設是 MP3 格式，即使副檔名是 .wav）
                communicate = edge_tts.Communicate(text, self.tts_voice)
                await communicate.save(temp_path)

                # 驗證生成的檔案是否為有效
                if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
                    raise Exception("生成的音訊檔案無效或為空")

                print(
                    f"Edge TTS 音訊檔案已生成: {temp_path}, 大小: {os.path.getsize(temp_path)} bytes"
                )

                # 使用 FFmpeg 轉換為真正的 WAVE 格式（Rhubarb 需要）
                wave_path = temp_path.replace(".wav", "_wave.wav")
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-i",
                    temp_path,
                    "-acodec",
                    "pcm_s16le",
                    "-ar",
                    "22050",
                    "-ac",
                    "1",
                    wave_path,
                    "-y",
                ]

                print(f"執行 FFmpeg 轉換命令: {' '.join(ffmpeg_cmd)}")
                result = subprocess.run(
                    ffmpeg_cmd, capture_output=True, text=True, timeout=30
                )

                if result.returncode != 0:
                    print(f"FFmpeg 錯誤輸出: {result.stderr}")
                    raise Exception(f"FFmpeg 轉換失敗: {result.stderr}")

                # 清理原始檔案
                os.unlink(temp_path)

                print(f"已轉換為 WAVE 格式: {wave_path}")
                return wave_path

            except Exception as e:
                print(f"Edge TTS 嘗試 {attempt + 1} 失敗: {str(e)}")
                print(f"錯誤類型: {type(e).__name__}")

                # 清理臨時檔案
                if "temp_path" in locals() and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except:
                        pass

                # 如果不是最後一次嘗試，等待後重試
                if attempt < max_retries - 1:
                    print(f"等待 {retry_delay} 秒後重試...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # 指數退避
                else:
                    # 最後一次嘗試失敗，拋出錯誤
                    print(f"所有 Edge TTS 嘗試都失敗了")
                    raise Exception(
                        f"Edge TTS 失敗（已重試 {max_retries} 次）: {str(e)}"
                    )

    async def _offline_tts(self, text: str) -> str:
        """使用 gTTS 作為備援 TTS 生成語音"""
        try:
            print("使用 gTTS 作為備援 TTS...")

            # 建立臨時檔案
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name

            # 使用 gTTS 生成繁體中文語音
            tts = gTTS(text=text, lang="zh-tw", slow=False)

            # 生成音檔
            tts.save(temp_path)

            # 驗證生成的檔案
            if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
                raise Exception("離線 TTS 生成的音訊檔案無效或為空")

            print(
                f"gTTS 音訊檔案已生成: {temp_path}, 大小: {os.path.getsize(temp_path)} bytes"
            )

            # 使用 FFmpeg 轉換為 Rhubarb 需要的格式
            wave_path = temp_path.replace(".wav", "_wave.wav")
            ffmpeg_cmd = [
                "ffmpeg",
                "-i",
                temp_path,
                "-acodec",
                "pcm_s16le",
                "-ar",
                "22050",
                "-ac",
                "1",
                wave_path,
                "-y",
            ]

            print(f"執行 FFmpeg 轉換命令: {' '.join(ffmpeg_cmd)}")
            result = subprocess.run(
                ffmpeg_cmd, capture_output=True, text=True, timeout=30
            )

            if result.returncode != 0:
                print(f"FFmpeg 錯誤輸出: {result.stderr}")
                raise Exception(f"FFmpeg 轉換失敗: {result.stderr}")

            # 清理原始檔案
            os.unlink(temp_path)

            print(f"gTTS 已轉換為 WAVE 格式: {wave_path}")
            return wave_path

        except Exception as e:
            print(f"gTTS 失敗: {str(e)}")
            print(f"錯誤類型: {type(e).__name__}")
            raise Exception(f"gTTS 失敗: {str(e)}")

    async def analyze_audio(self, audio_file_path: str) -> Dict[str, Any]:
        """
        使用 Rhubarb Lip Sync 分析音訊，生成動畫腳本
        """
        try:
            # 檢查音訊檔案是否存在且有效
            if not os.path.exists(audio_file_path):
                raise Exception(f"音訊檔案不存在: {audio_file_path}")

            file_size = os.path.getsize(audio_file_path)
            if file_size == 0:
                raise Exception(f"音訊檔案為空: {audio_file_path}")

            print(f"準備分析音訊檔案: {audio_file_path}, 大小: {file_size} bytes")

            # 建立輸出 JSON 檔案路徑
            output_json_path = audio_file_path.replace(".wav", "_animation.json")

            # 執行 Rhubarb Lip Sync 命令（使用 phonetic 模式，不需要字典檔案）
            rhubarb_cmd = [
                self.rhubarb_path,
                "-r",
                "phonetic",  # 使用音素模式，不需要字典檔案
                audio_file_path,  # 音訊檔案
                "-f",
                "json",
                "-o",
                output_json_path,
            ]

            print(f"執行 Rhubarb 命令: {' '.join(rhubarb_cmd)}")
            print(f"Rhubarb 路徑: {self.rhubarb_path}")
            print(f"音訊檔案: {audio_file_path}")

            # 執行命令
            result = subprocess.run(
                rhubarb_cmd, capture_output=True, text=True, timeout=30
            )

            if result.returncode != 0:
                raise Exception(f"Rhubarb Lip Sync 執行失敗: {result.stderr}")

            # 讀取生成的 JSON 檔案
            with open(output_json_path, "r", encoding="utf-8") as f:
                animation_data = json.load(f)

            # 清理臨時檔案
            os.unlink(output_json_path)

            # 轉換為前端可用的格式
            return self._convert_animation_format(animation_data)

        except Exception as e:
            print(f"音訊分析時發生錯誤: {str(e)}")  # 添加日誌
            print(f"錯誤類型: {type(e).__name__}")  # 添加錯誤類型
            import traceback

            print(f"錯誤堆疊: {traceback.format_exc()}")  # 添加完整堆疊
            raise Exception(f"音訊分析時發生錯誤: {str(e)}")

    def _convert_animation_format(self, rhubarb_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        將 Rhubarb Lip Sync 的輸出轉換為前端可用的動畫格式
        """
        try:
            # 提取嘴型動畫數據
            mouth_cues = rhubarb_data.get("mouthCues", [])

            # 轉換為前端格式
            animation_script = {
                "duration": 0,  # 將在下面計算
                "mouth_shapes": [],
                "head_movements": [],  # 可選的頭部動作
            }

            total_duration = 0
            for cue in mouth_cues:
                start_time = cue.get("start", 0)
                end_time = cue.get("end", 0)
                mouth_shape = cue.get("value", "X")  # X, A, B, C, D, E, F, G, H, X

                # Rhubarb 輸出已經是秒，不需要轉換
                start_seconds = start_time
                end_seconds = end_time

                animation_script["mouth_shapes"].append(
                    {"start": start_seconds, "end": end_seconds, "shape": mouth_shape}
                )

                total_duration = max(total_duration, end_time)

            # 總時長已經是秒
            animation_script["duration"] = total_duration

            # 添加簡單的頭部動作（可選）
            # total_duration 現在已經是秒，直接傳入
            animation_script["head_movements"] = self._generate_head_movements(
                total_duration
            )

            return animation_script

        except Exception as e:
            raise Exception(f"轉換動畫格式時發生錯誤: {str(e)}")

    def _generate_head_movements(self, duration: float) -> list:
        """
        生成簡單的頭部動作（輕微擺動）
        """
        movements = []
        interval = 2.0  # 每2秒一個動作

        # duration 現在已經是秒，直接使用
        duration_seconds = duration

        for i in range(0, int(duration_seconds), int(interval)):
            movements.append(
                {
                    "start": i,
                    "end": min(i + 0.5, duration_seconds),  # 動作持續0.5秒
                    "type": "nod",
                    "intensity": 0.1,
                }
            )

        return movements
