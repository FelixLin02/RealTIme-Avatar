專案總覽 (Project Overview)
專案名稱
LINE LIFF 健康陪跑虛擬人 (即時渲染 MVP)

核心目標
打造一個在 LINE LIFF 環境中運行的即時渲染虛擬人。虛擬人會處於持續的閒置待機狀態；當收到使用者的文字後，能立即根據生成的語音，在前端即時渲染出嘴型與頭部動畫，提供無縫的互動體驗。

[專案備註]：鑑於 STT > LLM > TTS 的內容生成流程已有初步版本，本 MVP 的技術重心將完全專注於驗證「前端即時渲染」的可行性與效果。設計上必須確保此渲染模組的高內聚、低耦合，未來能夠靈活地被擷取、分離或整合至其他應用中。

技術選型與理由 (Technology Stack & Rationale)
組件

選用技術

理由

前端介面

LINE LIFF

無縫整合 LINE 生態，使用者無需安裝額外 App。

前端渲染

Live2D / PixiJS

Live2D 是 2D 虛擬人動畫的業界標竿，能實現精細的表情與動作。PixiJS 是一個輕量的 2D 渲染引擎，可手動實現嘴型圖片的切換與變形，更具客製化彈性。

大型語言模型

OpenAI API (GPT系列)

提供強大且自然的中文語意理解與生成能力。

文字轉語音

Edge TTS

完全免費，且提供高品質、非常自然的中文語音。

音訊分析

Rhubarb Lip Sync

成熟的開源工具，能精準分析音訊檔，並產生包含嘴型與時間點的 JSON 腳本，是後端產生動畫數據的關鍵。

後端伺服器

Python (FastAPI / Flask)

Python 能輕鬆串接所有 AI 服務，並執行 Rhubarb Lip Sync 的命令列工具。

雲端儲存

AWS S3 / Google Cloud Storage

用於存放每次生成的 WAV 音訊檔，並提供 URL 給前端播放。

架構設計原則：明確的功能切割
為了確保渲染技術的獨立性與未來可複用性，本專案嚴格遵守以下設計原則：

後端為「無頭數據提供者」(Headless Data Provider)：後端的職責僅限於生成內容，並將其打包成一個標準化的數據格式（音訊URL + 動畫JSON）。它不關心前端如何呈現這些數據。

前端為「獨立渲染引擎」(Standalone Rendering Engine)：前端的渲染模組被設計成一個獨立的元件。它只需要接收標準格式的數據即可運作，完全不知道這些數據是由哪個 LLM 或 TTS 產生的。

這種分離確保了未來您可以輕易地替換後端的 LLM，或將這個前端渲染引擎整個搬到另一個完全不同的專案中使用。

系統架構與流程圖 (System Architecture & Flowchart)
sequenceDiagram
    participant User as 使用者
    participant LIFF_App as 前端渲染模組
    participant Server as 後端內容生成模組

    box LightBlue 前端 (LIFF App)
        participant User
        participant LIFF_App
    end

    box LightGreen 後端 (Server)
        participant Server
    end

    User->>LIFF_App: 輸入文字並送出
    LIFF_App->>Server: 發送 API 請求 (包含文字)
    
    Server->>Server: 執行 LLM -> TTS -> 音訊分析
    Note over Server: 產生音訊檔(WAV)與<br>動畫腳本(JSON)
    
    Server-->>LIFF_App: **一次性傳回標準化數據**<br>1. 音訊 URL<br>2. 動畫腳本 JSON
    
    LIFF_App->>LIFF_App: **前端獨立渲染**<br>1. 播放音訊<br>2. 同步讀取 JSON，驅動模型動畫
    LIFF_App->>User: 看到虛擬人即時說話與動作

前後端分工詳解 (Frontend & Backend Responsibilities)
後端伺服器 (內容生成模組)
後端的任務是成為一個高效的「數據工廠」。

接收請求：接收前端發來的文字。

生成內容：呼叫 OpenAI 取得回覆文字。

生成音訊：呼叫 Edge TTS 將文字轉為 .wav 音訊檔。

生成腳本 (核心)：呼叫 Rhubarb Lip Sync 分析該 .wav 檔，產生一個精確到毫秒的嘴型動畫腳本 (JSON 格式)。

回傳數據：將 .wav 檔上傳到雲端儲存，然後將「音訊的 URL」和「動畫腳本 JSON」這兩份數據一起回傳給前端。

前端 LIFF App (獨立渲染引擎)
前端的任務是成為一個靈活的「舞台表演者」。

閒置狀態：在沒有互動時，前端透過 JavaScript 程序化地產生閒置動畫（如柏林噪聲驅動的呼吸、隨機眨眼），讓虛擬人保持生動。

接收數據：從後端 API 拿到「音訊 URL」和「動畫腳本 JSON」。

同步播放與渲染：

立即開始播放音訊。

同時啟動一個渲染迴圈 (requestAnimationFrame)。

在每一幀，程式會檢查當前的音訊播放時間，並從 JSON 腳本中找到對應的嘴型指令。

根據指令，即時更新 Live2D 或 PixiJS 模型的嘴型、頭部擺動等參數。

計算嘴型之間的平滑過渡，讓動畫看起來更自然。

播放結束：音訊播放完畢後，停止讀取腳本，並切換回閒置動畫狀態，等待下一次互動。

介面設計與實現
圓形框架：您的虛擬人將在一個 <canvas> 元素中進行渲染，並使用 CSS 的 border-radius: 50% 將這個 canvas 裁切成圓形，確保所有動畫都在框架內。

渲染引擎：您需要在前端引入 Live2D 或 PixiJS 的函式庫，並載入您的虛擬人模型檔案。

動畫邏輯：所有動畫邏輯，包含閒置和說話時的渲染，都將由您在 LIFF 頁面中的 JavaScript 程式碼完全控制。