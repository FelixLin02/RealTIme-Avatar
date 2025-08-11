# 解決影片輸出與前端動態顯示問題
_Exported on 8/8/2025 at 13:52:55 GMT+8 from Cursor (1.4.2)_

---

**User**

目前問題:
1. 產出影片雖是mp4檔，實際並未有動作，仍然是一張不會動的照片。請參考@Success/ 動態生成
2. 前端是否可以不要用影片方式上傳，直接動態表現在前端
先不要寫CODE，給我修正改善MARKDOWN

---

**Cursor**

我先快速檢視你專案中後端 SadTalker 呼叫流程與 `Success/` 內的動態生成腳本，對照前端 `frontend/index.html`，以便提出精準的修正建議與改進方案（先不寫程式碼）。接著我會整理成結構化的 Markdown 改善清單與執行步驟。

### 修正改善提案（不含程式碼）

- 針對你提出的兩點問題，我已比對 `app/services/sadtalker_service.py` 與 `Success/lipsync/run_sadtalker.py`，以及前端 `frontend/index.html` 的行為。
- 結論：目前後端用的是「簡化版偽動態（OpenCV+亮度）」而非 SadTalker 正式管線，所以產生的 mp4 幾乎是靜態；前端若要「不走影片檔」，建議改走「音訊+viseme/能量時序→前端即時渲染」或「係數流/WebSocket」兩路線。

---

### 目標
- 讓輸出的內容「確實有臉部動作」且可和音訊同步。
- 支援「前端不必上傳/載入完整影片檔」，直接在前端動態呈現。

---

### 問題現況與根因

- 後端檔案 `app/services/sadtalker_service.py`：
  - 現行 `generate_video()` 呼叫 `_create_talking_video()`，只是用 OpenCV 對嘴部區域做些微亮度擾動，沒有 3DMM 驅動，也沒有嘴型/表情係數，因此畫面幾乎不動。
  - `_create_demo_video()` 則是 `ffmpeg -loop 1` 合成（純靜態圖+音訊），更是完全不動。
  - 未整合 `Success/lipsync/run_sadtalker.py` 的 SadTalker 正式流程（CropAndExtract → Audio2Coeff → AnimateFromCoeff）。
- 前端 `frontend/index.html`：
  - 使用 `video` 來載入後端產出的 mp4。若產出為近似靜態（或同路徑重複覆寫、被瀏覽器快取），就看起來像是「一張不會動的照片」。

---

### 修正方案 A：後端改回 SadTalker 正式動態生成（參考 `Success/lipsync/run_sadtalker.py`）

- 核心調整
  - 用 SadTalker 正式管線產生影片：`CropAndExtract` → `Audio2Coeff` → `AnimateFromCoeff`，確保臉部表情/嘴型由音訊驅動。
  - 確保 `ffmpeg` 存在，完成「影像+音訊」合成（libx264 + aac），避免某些裝置/瀏覽器不相容。
  - 輸出命名採用時間戳（避免覆蓋舊檔），回傳唯一 URL，減少快取造成的「看起來沒變動」。

- 執行步驟（不寫程式）
  1) 依賴確認
     - 檢查 `SadTalker/checkpoints/` 是否齊全（與你 `Success/` 成功紀錄一致）。
     - `ffmpeg` 可執行，確保 H.264 + AAC 正常輸出。
  2) 生成流程對齊 `Success/lipsync/run_sadtalker.py`
     - 固定參數：`--size 256`、`--preprocess full`、`--still False`、`--expression_scale 1.0`；可視需求暴露為設定。
     - 統一路徑：`source_image`、`driven_audio`、`result_dir`（時間戳子資料夾），最終 mp4 檔移動到可公開存取的資料夾（例如 `public/videos/`）。
  3) 回傳給前端
     - 回傳 JSON：`{ success: true, video_url: "/videos/2025_07_08_21.04.30/avatar_output_with_audio.mp4" }`。
     - 每次產生新檔名，避免瀏覽器快取造成舊畫面。

- 驗收清單
  - 影片明顯有嘴型與表情變化，非單純亮度閃爍。
  - `mediainfo` 或 `ffprobe` 顯示有視訊流與音訊流，編碼為 H.264/AAC。
  - 多次請求得到不同 URL，前端播放正確、無舊檔快取問題。

---

### 修正方案 B：前端不走影片，改「動態表現」（兩條路線）

- 路線 B1：輕量即時渲染（不載入影片檔）
  - 後端輸出：
    - TTS 音訊 URL（例如 `/audios/xxx.wav`）。
    - 嘴型/表情驅動時序資料（兩種選擇之一）：
      - 簡易版：每幀/每 10ms 的能量（RMS）序列，JSON。
      - 進階版：viseme/phoneme 對應嘴型的時序（可參考 `Success/lipsync/align_phoneme.py` 的對齊方式）。
  - 前端呈現：
    - 使用 `<audio>` + Web Audio API 取得播放進度；用 Canvas 或 CSS/SVG 對嘴部遮罩/貼圖做「張合/形變」。
    - 好處：不傳影片，快、可互動；壞處：視覺擬真度 < SadTalker 影片。
  - 介面建議
    - 新 API：`POST /talk` → 回傳 `{ audio_url, mouth_series | viseme_series }`。
    - 新資源：`GET /audios/:id.wav`，CORS/CSP 調整允許 `audio`、`blob:`（若需）。

- 路線 B2：係數流/WebSocket（更擬真、即時）
  - 後端輸出：
    - 以 WebSocket 送出係數流或更細緻的嘴型/表情權重（頻率 25–30fps）。
    - 選擇性同時推送小貼圖分片或點陣資訊（成本高）。
  - 前端呈現：
    - `requestAnimationFrame` 根據時間戳套用係數（WebGL/Canvas）。
    - 優點：即時、無影片；缺點：實作成本高、裝置相容性要評估。
  - 介面建議
    - 新端點：`ws://.../realtime_talk`。
    - 訊息格式：`{ t: 1234ms, mouth_open: 0.42, eyebrow: 0.1, ... }`。

- 小結與建議
  - 若你優先「快速可用」：先採 B1（音訊+能量/viseme 序列），MVP 即可達成「不載入影片」的動態嘴型。
  - 若你追求「高擬真+即時」：規劃 B2，但需要較多前後端同步設計與效能測試。

---

### API 契約建議（不含程式碼）

- 保留現有影片產出 API（修正為真正 SadTalker）：
  - `POST /generate_video`
  - 請求：`{ message, user_id }`
  - 回應：`{ success: true, video_url }`
- 新增「不走影片」API（B1 輕量版）：
  - `POST /talk`
  - 請求：`{ message, user_id }`
  - 回應：`{ success: true, audio_url, mouth_series | viseme_series }`
- 安全/CSP 建議
  - `connect-src` 加上你的 API 網域與 `wss:`（若採 B2）。
  - `media-src` 明確允許音訊來源與 `blob:`（若前端用 MSE/URL.createObjectURL）。

---

### 驗收與除錯建議

- 影片動態驗證
  - 以 `ffprobe` 檢查產出影片是否有正確的視訊/音訊流與幀數（非 1 幀）。
  - 確保輸出目錄按時間戳產生新檔名，避免 cache 命中。
- 前端播放驗證
  - 切換至唯一的 `video_url`，關閉快取或在 URL 後加上查詢參數避免快取（僅測試用）。
- B1 路線驗收
  - 前端播放音訊時，嘴型可隨播放進度同步改變；停止/seek 正常。
- B2 路線驗收
  - 高頻 WebSocket 傳輸下，FPS 能維持 25–30fps，手機端不掉幀。

---

### 實作順序（MVP 優先）
1) 後端：切回 SadTalker 正式管線，確保 mp4 有動作（A 方案）。
2) 前端：保留現有 `video` 流程，先驗證動態影片可播放。
3) 新增 `POST /talk` 並提供 `audio_url + mouth/viseme 序列`（B1）。
4) 前端：Canvas/CSS 嘴型動畫 MVP（不載入影片）。
5) 視需求再規劃 B2（WebSocket/係數流）以達到更即時、更擬真。

---

### 後續可選改進
- 音訊對齊：採用 phoneme 對齊（`align_phoneme.py`）提升嘴型準確度。
- 效能：預先快取 `CropAndExtract` 結果，降低重複圖片多次處理開銷。
- 錯誤回報：回傳更明確錯誤（模型遺失、ffmpeg 缺失、音訊格式不符）。

---

已完成：檢閱後端/前端現況，整理兩路線完整調整方案與驗收清單。  
下一步：請確認要先採 A 方案（修正為真正 SadTalker 影片）或直接推進 B1（前端不載入影片、用嘴型時序動態渲染）。

