# 多階段建置：建置階段
FROM node:18-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製原始碼
COPY . .

# 建置應用程式
RUN npm run build

# 生產階段：使用 Nginx 提供靜態檔案
FROM nginx:alpine

# 複製建置結果到 Nginx 目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製自訂 Nginx 配置（可選）
# COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]
