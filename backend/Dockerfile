# 使用 Python 3.11 作為基礎映像
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libasound2-dev \
    libboost-all-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 安裝較新版 CMake（解決 CMP0167 等政策問題）
RUN pip install --no-cache-dir "cmake>=3.28"

# 建置並安裝 Rhubarb Lip Sync（從原始碼）
RUN git clone https://github.com/DanielSWolf/rhubarb-lip-sync.git /tmp/rhubarb \
    && cd /tmp/rhubarb \
    && mkdir build \
    && cd build \
    && /usr/local/bin/cmake .. \
    && /usr/local/bin/cmake --build . --target rhubarb -j"$(nproc)" \
    && find . -maxdepth 5 -type f -name rhubarb -exec cp {} /usr/local/bin/ \; \
    && cp -r /tmp/rhubarb/build/rhubarb/res /usr/local/bin/ \
    && cd / \
    && rm -rf /tmp/rhubarb

# 設定 rhubarb 執行路徑
ENV RHUBARB_PATH=/usr/local/bin/rhubarb

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
