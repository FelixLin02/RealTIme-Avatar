# RealTime Avatar - LINE LIFF 健康陪跑虛擬人

一個基於 LINE LIFF 的即時渲染虛擬人系統，能夠根據使用者輸入生成語音並同步嘴部動作。

## 🎯 專案概述

本專案實現了一個完整的虛擬人系統，包含：

- **即時語音生成**：使用 Edge TTS 將文字轉換為自然語音
- **嘴部同步動畫**：使用 Rhubarb Lip Sync 分析音頻並生成嘴部動作
- **2D 虛擬人渲染**：使用 PixiJS 實現流暢的 2D 動畫
- **LINE LIFF 整合**：完全整合到 LINE 生態系統中
- **高內聚低耦合架構**：渲染模組可獨立重用

## 🚀 快速開始

### 前置需求

- Python 3.8+
- Node.js 16+
- npm 或 yarn
- Rhubarb Lip Sync（可選）

### 一鍵啟動

```bash
# 執行快速啟動腳本
python start_dev.py
```

腳本會自動：
- 檢查環境需求
- 安裝依賴套件
- 啟動後端和前端服務
- 執行系統測試

### 手動啟動

1. **設定環境變數**
   ```bash
   # 後端
   cp backend/.env.example backend/.env
   # 編輯 backend/.env 填入 OpenAI API Key 等設定
   
   # 前端
   cp frontend/.env.example frontend/.env
   # 編輯 frontend/.env 填入 API URL 等設定
   ```

2. **安裝依賴**
   ```bash
   # 後端
   cd backend
   pip install -r requirements.txt
   
   # 前端
   cd frontend
   npm install
   ```

3. **啟動服務**
   ```bash
   # 後端 (http://localhost:8000)
   cd backend
   python main.py
   
   # 前端 (http://localhost:3000)
   cd frontend
   npm run dev
   ```

## 📁 專案結構

```
RealTime Avatar/
├── backend/                 # 後端 API 服務
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── core/           # 核心配置
│   │   └── services/       # 業務邏輯服務
│   ├── main.py             # 應用程式入口
│   └── requirements.txt    # Python 依賴
├── frontend/               # 前端應用
│   ├── src/
│   │   ├── components/     # React 元件
│   │   └── services/       # API 服務
│   ├── index.html          # HTML 模板
│   └── package.json        # Node.js 依賴
├── docs/                   # 文件
├── test_setup.py          # 環境測試腳本
├── start_dev.py           # 快速啟動腳本
└── Pipeline.md            # 專案架構文件
```

## 🏗️ 技術架構

### 後端技術棧
- **FastAPI**：現代化 Python Web 框架
- **OpenAI GPT**：自然語言處理
- **Edge TTS**：文字轉語音
- **Rhubarb Lip Sync**：音頻分析和嘴部同步
- **AWS S3/GCS**：雲端儲存

### 前端技術棧
- **React + TypeScript**：現代化前端框架
- **PixiJS**：2D 圖形渲染引擎
- **LINE LIFF**：LINE 平台整合
- **Vite**：快速開發工具

## 🔧 核心功能

### 1. 語音生成與分析
```python
# 文字轉語音
audio_file = await avatar_service.text_to_speech("你好，我是你的健康陪跑夥伴！")

# 音頻分析生成動畫腳本
animation_script = await avatar_service.analyze_audio(audio_file)
```

### 2. 即時動畫渲染
```typescript
// 虛擬人渲染
const avatar = new AvatarRenderer();
avatar.playAnimation(animationScript, audioUrl);
```

### 3. 嘴部同步
- 使用 Rhubarb Lip Sync 分析音頻
- 生成精確的嘴部形狀時間軸
- 即時更新虛擬人嘴部動作

## 📚 詳細文件

- [安裝指南](docs/INSTALLATION.md) - 完整的安裝和部署說明
- [架構文件](Pipeline.md) - 詳細的系統架構設計
- [API 文件](http://localhost:8000/docs) - 後端 API 文檔

## 🧪 測試

執行環境測試：
```bash
python test_setup.py
```

## 🚀 部署

### 本地開發
```bash
python start_dev.py
```

### 生產環境
參考 [docs/INSTALLATION.md](docs/INSTALLATION.md) 中的部署章節。

## 🤝 貢獻

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

## 📞 支援

如有問題或建議，請：
1. 查看 [docs/INSTALLATION.md](docs/INSTALLATION.md)
2. 檢查 [test_setup.py](test_setup.py) 的測試結果
3. 開啟 Issue 描述問題

---

**開發狀態**：MVP 版本完成，支援基本語音生成和嘴部同步功能。
