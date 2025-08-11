import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true
    },
    resolve: {
        alias: {
            '@eyes': path.resolve(__dirname, 'src/assets/eyes'),
            '@mouth-shapes': path.resolve(__dirname, 'src/assets/mouth-shapes'),
            '@mouth-variants': path.resolve(__dirname, 'src/assets/mouth-variants')
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
