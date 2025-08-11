# 使用 Python 3.11 作為基礎映像
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安裝 Rhubarb Lip Sync
RUN wget -O rhubarb-linux-x86_64.tar.gz \
    https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-linux-x86_64.tar.gz \
    && tar -xzf rhubarb-linux-x86_64.tar.gz \
    && mv rhubarb /usr/local/bin/ \
    && rm rhubarb-linux-x86_64.tar.gz

# 複製依賴檔案
COPY requirements.txt .

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式程式碼
COPY . .

# 建立上傳目錄
RUN mkdir -p uploads

# 設定環境變數
ENV PYTHONPATH=/app
ENV RHUBARB_PATH=/usr/local/bin/rhubarb

# 暴露端口
EXPOSE 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 啟動應用程式
CMD ["python", "main.py"]
