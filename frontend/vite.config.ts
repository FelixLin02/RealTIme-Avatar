import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 使用相對於專案根目錄的別名，避免 Node 型別相依

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true
    },
    resolve: {
        alias: {
            '@eyes': '/src/assets/eyes',
            '@mouth-shapes': '/src/assets/mouth-shapes',
            '@mouth-variants': '/src/assets/mouth-variants',
            '@assets': '/src/assets'
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    },
    define: {
        global: 'globalThis'
    }
})
