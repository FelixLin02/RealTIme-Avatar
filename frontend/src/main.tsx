import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 移除 StrictMode，避免在開發環境重複 mount/unmount 導致 PIXI 應用初始化被中斷
ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
)
