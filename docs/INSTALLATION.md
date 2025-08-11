# 安裝與部署指南

## 系統需求

### 後端需求
- Python 3.8+
- Rhubarb Lip Sync 命令列工具
- OpenAI API 金鑰
- 可選：AWS S3 或 Google Cloud Storage 帳戶

### 前端需求
- Node.js 16+
- npm 或 yarn

## 安裝步驟

### 1. 後端設置

#### 1.1 安裝 Python 依賴
```bash
cd backend
pip install -r requirements.txt
```

#### 1.2 安裝 Rhubarb Lip Sync

**Windows:**
```bash
# 下載並安裝 Rhubarb Lip Sync
# 從 https://github.com/DanielSWolf/rhubarb-lip-sync/releases 下載
# 將 rhubarb.exe 放在系統 PATH 中或指定路徑
```

**Linux/WSL:**
```bash
# 下載並編譯
git clone https://github.com/DanielSWolf/rhubarb-lip-sync.git
cd rhubarb-lip-sync
mkdir build && cd build
cmake ..
make
sudo make install
```

**macOS:**
```bash
brew install rhubarb-lip-sync
```

#### 1.3 配置環境變數
```bash
cd backend
cp env.example .env
# 編輯 .env 檔案，填入您的 API 金鑰
```

#### 1.4 啟動後端服務
```bash
python main.py
# 或使用 uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 前端設置

#### 2.1 安裝 Node.js 依賴
```bash
cd frontend
npm install
```

#### 2.2 配置環境變數
```bash
cp env.example .env
# 編輯 .env 檔案，設定 API URL
```

#### 2.3 啟動開發伺服器
```bash
npm run dev
```

## 部署指南

### 本地開發
1. 啟動後端：`cd backend && python main.py`
2. 啟動前端：`cd frontend && npm run dev`
3. 開啟瀏覽器訪問：`http://localhost:3000`

### 生產環境部署

#### 後端部署（使用 Docker）
```dockerfile
# backend/Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 前端部署
```bash
cd frontend
npm run build
# 將 dist 目錄部署到靜態檔案伺服器
```

### LINE LIFF 整合

1. 在 LINE Developers Console 建立 LIFF 應用
2. 設定 Endpoint URL 為您的前端應用 URL
3. 在 `frontend/src/App.tsx` 中初始化 LIFF：

```typescript
import liff from '@line/liff'

// 在 useEffect 中初始化
const initializeLiff = async () => {
  try {
    await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
    console.log('LIFF 初始化成功')
  } catch (error) {
    console.error('LIFF 初始化失敗:', error)
  }
}
```

## 故障排除

### 常見問題

1. **Rhubarb Lip Sync 找不到**
   - 確保已正確安裝並在 PATH 中
   - 在 `.env` 中設定正確的 `RHUBARB_PATH`

2. **OpenAI API 錯誤**
   - 檢查 API 金鑰是否正確
   - 確認帳戶有足夠的額度

3. **CORS 錯誤**
   - 確保後端 CORS 設定正確
   - 檢查前端 API URL 設定

4. **音訊播放問題**
   - 確保瀏覽器支援音訊播放
   - 檢查音訊檔案 URL 是否可存取

### 效能優化

1. **音訊快取**
   - 實作音訊檔案快取機制
   - 使用 CDN 加速音訊檔案傳輸

2. **動畫優化**
   - 使用 Web Workers 處理複雜動畫計算
   - 實作動畫幀率控制

3. **API 優化**
   - 實作請求快取
   - 使用連接池優化資料庫查詢

## 監控與日誌

### 後端監控
```python
# 在 main.py 中添加日誌配置
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### 前端監控
```typescript
// 添加錯誤追蹤
window.addEventListener('error', (event) => {
  console.error('應用程式錯誤:', event.error)
  // 發送到錯誤追蹤服務
})
```
