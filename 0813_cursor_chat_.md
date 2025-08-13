# localhosr上svg圖檔無法顯示原因
_Exported on 8/13/2025 at 16:49:08 GMT+8 from Cursor (1.4.3)_

---

**User**

localhosr上是什麼原因讓@assets/  裡的svg圖檔全部顯示不出來

---

**Cursor**

我先快速掃描前端設定與引用方式，確認 `@assets` 路徑別名是否正確（Vite/tsconfig）、實際引用的檔案路徑、以及元件中如何載入 SVG。接著我會同時查看 `vite.config.ts`、`App.tsx`、`AvatarRenderer.tsx`、`ChatInterface.tsx` 與 `index.html` 相關片段。

我會先同時搜尋是否有使用 `@assets` 的引用，以及檢查 `tsconfig` 是否有對應的 path 設定，來確認別名設定是否缺失。接著會確認是否有其他靜態路徑引用造成 404。

```javascript
import icon from '@assets/avatar-head.svg';
<img src={icon} />;
```

### 原因判斷（最可能）
- **未設定路徑別名**：`frontend/vite.config.ts` 只有 `@eyes`、`@mouth-shapes`、`@mouth-variants`，沒有 `@assets`。在 Vite 中，`@assets/...` 不會自動解析，直接用在 `<img src="@assets/...">`、CSS 或 JS 會是 404，導致本機（localhost）全部 SVG 顯示不出來。

### 快速修正方案（擇一）
- **方案 A：加上 `@assets` 別名（建議）**
  1) 更新 `frontend/vite.config.ts`：
```ts
// 加到 resolve.alias 內
'@assets': path.resolve(__dirname, 'src/assets')
```
  2) 若有 `tsconfig.json`，也加上（沒有就新建）：
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@assets/*": ["frontend/src/assets/*"]
    }
  }
}
```
  3) 使用方式：
```ts
import iconUrl from '@assets/avatar-head.svg'
// <img src={iconUrl} />
```

- **方案 B：改用 Vite 推薦的做法**
  - 將資源移到 `frontend/public/`，直接用絕對路徑：
```html
<img src="/avatar-head.svg">
```

- **方案 C：維持現有 `svgLoader`（已可用）**
  - 你的程式已用 `import.meta.glob('../assets/**/*.svg', { as: 'url' })` 生成 URL；不要在別處用 `@assets/...`，保持用 `svgLoader` 內的路徑即可。

### 建議檢查
- 開發者工具 Network：若看到 `GET @assets/... 404`，即是別名未解析。
- Console：若是 import 失敗或模組未找到，也會提示路徑解析錯誤。

狀態更新：
- 我已檢查 `vite.config.ts` 與前端元件與載入器；確認沒有設定 `@assets`。程式現行是透過 `svgLoader` 的 `import.meta.glob` 動態載入，該路徑沒問題。若你在其他地方使用 `@assets/...`，就會 404。

- 加上 `@assets` 別名或改用 `public/` 路徑即可解決顯示問題。

- 若你希望我直接提供完整的 `vite.config.ts` 與 `tsconfig.json` 內容，告訴我你偏好的方案（A 或 B）。

```typescript
// 加到 resolve.alias 內
'@assets': path.resolve(__dirname, 'src/assets')
```

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@assets/*": ["frontend/src/assets/*"]
    }
  }
}
```

```typescript
import iconUrl from '@assets/avatar-head.svg'
// <img src={iconUrl} />
```

```html
<img src="/avatar-head.svg">
```

---

**User**

@AvatarRenderer.tsx @AvatarRenderer.test.tsx 檢查這兩個檔案對於 @assets/ 的依賴關係是否正確

---

**Cursor**

### 檢查結果
- **`AvatarRenderer.tsx`**：未引用 `@assets/`。使用 `svgLoader` 與相對路徑配置載入 SVG，與 `@assets` 無關。
```1:5:frontend/src/components/AvatarRenderer.tsx
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
```
- **`AvatarRenderer.test.tsx`**：未引用 `@assets/`。以 Jest mock `svgLoader`，不會實際讀取資源。
```1:5:frontend/src/components/AvatarRenderer.test.tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AvatarRenderer from './AvatarRenderer'
```
```47:55:frontend/src/components/AvatarRenderer.test.tsx
// Mock SVG loader
jest.mock('../services/svgLoader', () => ({
    svgLoader: {
        preloadAll: jest.fn().mockResolvedValue(undefined),
        getTexture: jest.fn().mockReturnValue(null),
        cleanup: jest.fn()
    }
}))
```

### 判斷
- 以上兩檔案「沒有」依賴 `@assets/`，因此不會因 `@assets` 路徑別名缺失而導致載入失敗。
- 若本機 `localhost` 出現「`@assets/...` 404 或顯示不出來」，問題來源應該在其他檔案（或 HTML/CSS）使用了 `@assets/...`，但 `vite.config.ts` 未設定 `@assets` 別名。

### 建議
- 若你確實需要在其他地方使用 `@assets/...`，請在 `frontend/vite.config.ts` 加上：
```ts
resolve: {
    alias: {
        '@assets': path.resolve(__dirname, 'src/assets')
    }
}
```
- 或改用現有 `svgLoader` 的相對路徑機制、或將資源放到 `frontend/public/` 以絕對路徑存取（例：`/avatar-head.svg`）。

狀態更新：
- 已逐行確認 `AvatarRenderer.tsx`、`AvatarRenderer.test.tsx`，兩者皆無 `@assets/` 依賴；與 `@assets` 別名設定無關。若要我幫你在 Vite 補上 `@assets` 別名或掃描整個專案找出 `@assets` 的實際引用，告訴我你偏好的處理方式。

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
```

```typescriptreact
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AvatarRenderer from './AvatarRenderer'
```

```typescriptreact
// Mock SVG loader
jest.mock('../services/svgLoader', () => ({
    svgLoader: {
        preloadAll: jest.fn().mockResolvedValue(undefined),
        getTexture: jest.fn().mockReturnValue(null),
        cleanup: jest.fn()
    }
}))
```

```typescript
resolve: {
    alias: {
        '@assets': path.resolve(__dirname, 'src/assets')
    }
}
```

---

**User**

依照你的建議將@vite.config.ts 加入 的連結

---

**Cursor**

我將在 `frontend/vite.config.ts` 的 `resolve.alias` 中加入 `@assets` 對應到 `src/assets`，以便在專案中使用 `@assets/...` 路徑載入 SVG。接著會套用編輯。

```typescript
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
            '@mouth-variants': path.resolve(__dirname, 'src/assets/mouth-variants'),
            '@assets': path.resolve(__dirname, 'src/assets')
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

```

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
            '@mouth-variants': path.resolve(__dirname, 'src/assets/mouth-variants'),
            '@assets': path.resolve(__dirname, 'src/assets')
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

```

```typescript
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

```

### 計劃
- 在 `frontend/vite.config.ts` 加入 `@assets` 別名，並採用不依賴 Node 型別定義的方式（使用 Vite 支援的絕對路徑 `/src/...`）。

### 已執行
- 已編輯 `frontend/vite.config.ts`，新增 `@assets`，並將現有 alias 一併改為絕對路徑，避免 `path` 與 `__dirname` 型別錯誤。

```12:18:frontend/vite.config.ts
resolve: {
    alias: {
        '@eyes': '/src/assets/eyes',
        '@mouth-shapes': '/src/assets/mouth-shapes',
        '@mouth-variants': '/src/assets/mouth-variants',
        '@assets': '/src/assets'
    }
},
```

- 檢查 Lint：目前 `vite.config.ts` 無錯誤。

### 使用方式範例
- 在程式中匯入或引用：
```ts
import headUrl from '@assets/avatar-head.svg'
// <img src={headUrl} />
```
或
```ts
import eyes from '@assets/eyes/eyes_blink_close.svg'
```

### 注意
- `AvatarRenderer.tsx` 與 `AvatarRenderer.test.tsx` 沒有使用 `@assets/`；它們用的是 `svgLoader` 的 `import.meta.glob`，不受此改動影響。
- 若你有其他檔案用 `@assets/...`，現在應該在本機可正常解析。若仍顯示不出來，請開開發者工具確認 Network 有無 `@assets/...` 404，或貼出具體引用位置，我再對應修正。

- 我已將 `vite.config.ts` 完成修改並通過檢查。

```typescript
resolve: {
    alias: {
        '@eyes': '/src/assets/eyes',
        '@mouth-shapes': '/src/assets/mouth-shapes',
        '@mouth-variants': '/src/assets/mouth-variants',
        '@assets': '/src/assets'
    }
},
```

```typescript
import headUrl from '@assets/avatar-head.svg'
// <img src={headUrl} />
```

```typescript
import eyes from '@assets/eyes/eyes_blink_close.svg'
```

---

**User**

網頁svg載入沒有報錯，但卻出現一個300*300的透明圖檔而非avatar

---

**Cursor**

我先檢查前端依賴版本與 PIXI 版本、以及資源載入器回傳的紋理是否有效，並同時查看控制台是否有關鍵日誌字串未出現。接著我會讀取 `frontend/package.json` 來確認 `pixi.js` 版本。

我將調整 `AvatarRenderer.tsx` 中建立 `Sprite` 的順序：先設定貼圖再設定 `width/height`，避免 PIXI 在無貼圖的情況下設定尺寸導致縮放比為 Infinity/NaN，從而看起來是透明。接著我會套用編輯並檢查。

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    view: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        view: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            <canvas
                ref={canvasRef}
                className="avatar-canvas"
                width={300}
                height={300}
                style={{ display: 'block' }}
            />
            {isLoading && (
                <div className={`avatar-loading ${loadingStatus}`} style={{
                    position: 'absolute',
                    inset: 0
                }}>
                    <div className="status-indicator">
                        <div className="status-dot"></div>
                        <div className="loading-text">
                            {loadingStatus === 'loading' && '載入中...'}
                            {loadingStatus === 'success' && '載入完成！'}
                            {loadingStatus === 'error' && '載入失敗'}
                        </div>
                    </div>

                    <div className="progress-container">
                        <div
                            className="progress-bar"
                            style={{ width: `${loadingProgress * 100}%` }}
                        />
                    </div>

                    <div className="progress-text">
                        {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                        {loadingStatus === 'success' && '虛擬人準備就緒'}
                        {loadingStatus === 'error' && '請重新整理頁面'}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AvatarRenderer

```

### 可能原因
- 先設定 `Sprite` 的 `width/height`，但此時還沒有貼圖，PIXI 會在無貼圖基準時套尺寸，可能導致縮放比為 0、NaN 或不可見，看起來像透明的 300x300。

### 已修正
- 在 `AvatarRenderer.tsx` 內，調整建立順序為「先套貼圖，再設定位置與尺寸」：
```194:236:frontend/src/components/AvatarRenderer.tsx
// 左眼
const leftEye = new PIXI.Sprite()
leftEye.anchor.set(0.5)
updateEyeTexture(leftEye, 'normal')
leftEye.x = -35
leftEye.y = -30
leftEye.width = 28
leftEye.height = 28
leftEye.tint = 0x333333
container.addChild(leftEye)

// 右眼
const rightEye = new PIXI.Sprite()
rightEye.anchor.set(0.5)
updateEyeTexture(rightEye, 'normal')
rightEye.x = 35
rightEye.y = -30
rightEye.width = 28
rightEye.height = 28
rightEye.tint = 0x333333
container.addChild(rightEye)

// 嘴
const mouth = new PIXI.Sprite()
mouth.anchor.set(0.5)
updateMouthTexture(mouth, 'X')
mouth.x = 0
mouth.y = 20
mouth.width = 60
mouth.height = 40
mouth.tint = 0x7a3b2e
container.addChild(mouth)
```

### 請你操作
- 重新整理頁面，看是否已顯示簡化頭、眼、嘴的圖形與動畫。
- 若仍為透明，請在 Console 貼上 `svgLoader` 日誌（例如「資源載入成功/失敗」），我再針對資源 URL 或 PIXI 紋理進一步檢查。

- 本次變更重點：
  - `vite.config.ts` 新增 `@assets` 別名（已通過檢查）。
  - `AvatarRenderer.tsx` 先設貼圖再調尺寸，避免透明。

```typescriptreact
// 左眼
const leftEye = new PIXI.Sprite()
leftEye.anchor.set(0.5)
updateEyeTexture(leftEye, 'normal')
leftEye.x = -35
leftEye.y = -30
leftEye.width = 28
leftEye.height = 28
leftEye.tint = 0x333333
container.addChild(leftEye)

// 右眼
const rightEye = new PIXI.Sprite()
rightEye.anchor.set(0.5)
updateEyeTexture(rightEye, 'normal')
rightEye.x = 35
rightEye.y = -30
rightEye.width = 28
rightEye.height = 28
rightEye.tint = 0x333333
container.addChild(rightEye)

// 嘴
const mouth = new PIXI.Sprite()
mouth.anchor.set(0.5)
updateMouthTexture(mouth, 'X')
mouth.x = 0
mouth.y = 20
mouth.width = 60
mouth.height = 40
mouth.tint = 0x7a3b2e
container.addChild(mouth)
```

---

**User**

設定一個如果avatar沒成功運行就直接貼@avatar.svg 上去

---

**Cursor**

我會在 `AvatarRenderer.tsx` 加入錯誤時的圖片備援，以及新增 `*.svg` 的 TypeScript 模組宣告，確保編譯不報錯。接著套用編輯。

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
import avatarFallbackUrl from '@assets/avatar.svg'

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    view: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        view: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            <canvas
                ref={canvasRef}
                className="avatar-canvas"
                width={300}
                height={300}
                style={{ display: 'block' }}
            />
            {isLoading && (
                <div className={`avatar-loading ${loadingStatus}`} style={{
                    position: 'absolute',
                    inset: 0
                }}>
                    <div className="status-indicator">
                        <div className="status-dot"></div>
                        <div className="loading-text">
                            {loadingStatus === 'loading' && '載入中...'}
                            {loadingStatus === 'success' && '載入完成！'}
                            {loadingStatus === 'error' && '載入失敗'}
                        </div>
                    </div>

                    <div className="progress-container">
                        <div
                            className="progress-bar"
                            style={{ width: `${loadingProgress * 100}%` }}
                        />
                    </div>

                    <div className="progress-text">
                        {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                        {loadingStatus === 'success' && '虛擬人準備就緒'}
                        {loadingStatus === 'error' && '請重新整理頁面'}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
import avatarFallbackUrl from '@assets/avatar.svg'

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    view: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        view: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
import avatarFallbackUrl from '@assets/avatar.svg'

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    view: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        view: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    view: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        view: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

### 實作內容
- 加入「渲染失敗時自動顯示備援圖片」機制：
  - 初始化 PIXI 若兩次都失敗，直接切到 `<img src={avatar.svg}>`。
  - 成功初始化後，若 1.5 秒內偵測不到任何有效紋理，也自動切到備援圖片。

### 你會看到的變化
- 畫面正常時：顯示 Canvas 版虛擬人（含載入條、動畫）。
- PIXI 或資源失敗時：自動顯示 `frontend/src/assets/avatar.svg` 的 300x300 圖。

### 主要編輯
```10:10:frontend/src/components/AvatarRenderer.tsx
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href
```
```38:54:frontend/src/components/AvatarRenderer.tsx
const [useImageFallback, setUseImageFallback] = useState(false)
```
- PIXI 初始化雙重失敗時直接備援：
```74:91:frontend/src/components/AvatarRenderer.tsx
console.error('PIXI Application 降級後仍初始化失敗:', e2)
setLoadingStatus('error')
setUseImageFallback(true)
setIsLoading(false)
return
```
- 初始化完成後的紋理健康檢查，逾時 1.5s 切換備援：
```131:151:frontend/src/components/AvatarRenderer.tsx
setTimeout(() => {
  if (useImageFallback) return
  const avatar = avatarRef.current
  if (!avatar) return
  const mouthTex: any = avatar.mouth?.texture as any
  const [le, re] = avatar.eyes || []
  const leTex: any = (le as any)?.texture
  const reTex: any = (re as any)?.texture
  const hasValid = Boolean(
    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
    (reTex && (reTex.valid || reTex.baseTexture?.valid))
  )
  if (!hasValid) {
    console.warn('Avatar 紋理未就緒，切換為圖片備援')
    setUseImageFallback(true)
  }
}, 1500)
```
- JSX 中切換 Canvas 或 IMG：
```421:458:frontend/src/components/AvatarRenderer.tsx
{useImageFallback ? (
  <img src={avatarFallbackUrl} alt="avatar" width={300} height={300} style={{ display: 'block', width: 300, height: 300 }} />
) : (
  <>
    <canvas ... />
    {isLoading && <div className={`avatar-loading ${loadingStatus}`}>...</div>}
  </>
)}
```

### 下一步
- 重新整理頁面觀察：
  - 若仍直接顯示備援圖，請開 Console 貼出日誌（PIXI init 失敗或資源載入失敗訊息），我再鎖定問題點（例如 CORS、URL 解析、PIXI 版本 API 差異）。

```typescriptreact
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href
```

```typescriptreact
const [useImageFallback, setUseImageFallback] = useState(false)
```

```typescriptreact
console.error('PIXI Application 降級後仍初始化失敗:', e2)
setLoadingStatus('error')
setUseImageFallback(true)
setIsLoading(false)
return
```

```typescriptreact
setTimeout(() => {
  if (useImageFallback) return
  const avatar = avatarRef.current
  if (!avatar) return
  const mouthTex: any = avatar.mouth?.texture as any
  const [le, re] = avatar.eyes || []
  const leTex: any = (le as any)?.texture
  const reTex: any = (re as any)?.texture
  const hasValid = Boolean(
    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
    (reTex && (reTex.valid || reTex.baseTexture?.valid))
  )
  if (!hasValid) {
    console.warn('Avatar 紋理未就緒，切換為圖片備援')
    setUseImageFallback(true)
  }
}, 1500)
```

```typescriptreact
{useImageFallback ? (
  <img src={avatarFallbackUrl} alt="avatar" width={300} height={300} style={{ display: 'block', width: 300, height: 300 }} />
) : (
  <>
    <canvas ... />
    {isLoading && <div className={`avatar-loading ${loadingStatus}`}>...</div>}
  </>
)}
```

---

**User**

給我一份詳細完整的trouble shooting.md建議書解釋為什麼如圖無法出現avatar

---

**Cursor**

### trouble-shooting.md（Avatar 在畫面上不顯示的原因排查與修復建議）

這份文件協助你從快到慢定位「畫面只剩一個 300×300 白色方塊（或透明）」而看不到 Avatar 的原因，並提供立即可用的修復建議與驗證步驟。

---

### 0. 快速診斷清單（5 分鐘內）
- 開啟瀏覽器 Console 與 Network。
- Console 是否有以下任一訊息？
  - PIXI Application init 失敗（或降級仍失敗）
  - 資源載入失敗: 找不到資源 URL
  - 背景載入 SVG 失敗，使用備援紋理
- Network 是否出現 404（特別是 `/src/assets/...` 或 `@assets/...`）？
- 在 Console 執行：
  - `window.__pixiApp?.stage?.children?.length`（應 ≥ 1）
  - `window.__avatar?.children?.length`（應 = 3，頭、左眼、右眼）
  - `window.__avatar?.getBounds()`（應該有寬高 > 0）
- 若你看到 `<img src=".../avatar.svg">` 而非 `<canvas>`，代表已啟動備援圖機制；若仍是白底空白畫布，代表 PIXI 沒有把圖形畫到你看到的那個 `<canvas>` 上。

---

### 1. 最可能的主因（優先檢查）
- 1-1. PIXI v7 初始化參數鍵名不正確，導致 PIXI 在「另一個不可見的 Canvas」上渲染
  - 你程式目前用的是 `view: canvasRef.current!`，但 PIXI v7（專案使用 7.3.2）標準參數是 `canvas: HTMLCanvasElement`。
  - 結果：PIXI 可能新建了自己的內部 canvas 進行渲染；DOM 內那個 300×300 的 `<canvas>` 只被 CSS 塗白，看起來像空的白框。
  - 修復：把 `init` 的 `view` 換成 `canvas`（見第 6 節代碼）。

- 1-2. 在「沒有貼圖」時就先設定 `Sprite` 的 `width/height`
  - 會導致縮放比或基準異常，物件可能不可見。已在 `AvatarRenderer.tsx` 調整為「先設貼圖，再設尺寸」，此類問題已修。

- 1-3. 資源別名與 URL
  - 你的 `vite.config.ts` 先前沒有 `@assets`，已補上。若其他檔案仍用 `@assets/...` 卻拼錯或目錄不符，仍會 404（請看 Network）。
  - 你目前的 SVG 載入走 `import.meta.glob('../assets/**/*.svg', { as: 'url' })`，與 `@assets` 無關；若這個對映沒生成到對應檔案，會在 Console 出現「找不到資源 URL」。

- 1-4. Windows 路徑與非 ASCII
  - 專案路徑含中文字：`C:\林子科\...`。一般 Vite 沒問題，但若你看到資源 URL 被錯誤編碼或開不到，請留意 Network 的實際請求 URL 是否被轉義錯誤。

---

### 2. 驗證 PIXI 是否真的在渲染
- 頁面載入後，在 Console 執行：
  - `__pixiApp?.renderer ? 'renderer ok' : 'renderer missing'`
  - `__pixiApp?.canvas?.width`（應為 300 或依 DPR 調整）
  - `__pixiApp?.stage?.children?.map(c => c.constructor?.name)`（應包含 `Container`、`Graphics`、`Sprite`）
  - `__avatar?.children?.length`（應 = 3）
- 如果 `__pixiApp.canvas` 與你 DOM 看到 `<canvas>` 不是同一個節點，幾乎可確定你踩到了 1-1 問題（PIXI 在另一個 canvas 上渲染）。

---

### 3. 驗證資源與紋理
- 在 Console 看載入紀錄：
  - 「所有 SVG 資源載入完成」或「資源載入成功: X」代表有取得 URL。
  - 若有「找不到資源 URL: ../assets/...」或載入失敗，代表 `import.meta.glob` 沒匹配到，或檔名路徑和程式設定不一致。
- 在 Console 檢查紋理有效性：
  - `__avatar.mouth.texture?.valid`、`__avatar.eyes[0].texture?.valid` 等。若全是 `false`，將觸發 1.5 秒後的圖片備援。

---

### 4. DOM/CSS 影響
- 你的 CSS 會把 `<canvas>` 填成白底（`background: #fff`），即使 PIXI 沒畫東西，看起來也會是白色方塊。
- 可暫時關掉 `.avatar-canvas` 的白底，觀察實際渲染（純透明背景更容易判讀是否有畫圖）。

---

### 5. 別名與資產路徑檢查
- `vite.config.ts` 應有：
```ts
resolve: {
    alias: {
        '@assets': '/src/assets',
        '@eyes': '/src/assets/eyes',
        '@mouth-shapes': '/src/assets/mouth-shapes',
        '@mouth-variants': '/src/assets/mouth-variants'
    }
}
```
- Network 面板若見 `@assets/...` 404，代表引用位置仍有舊路徑或拼字錯誤。
- 若你改走 public 資料夾，也可用 `/avatar-head.svg` 這種絕對路徑，繞過 alias。

---

### 6. 建議修復（關鍵代碼片段）
- 把 `AvatarRenderer.tsx` 內 PIXI 初始化的 `init` 參數由 `view` 改為 `canvas`。同時保留降級邏輯。

範例（示意替換）：
```ts
const app = new PIXI.Application()
await (app as any).init?.({
  canvas: canvasRef.current!,   // 原本是 view: canvasRef.current!
  width: 300,
  height: 300,
  backgroundAlpha: 0,
  antialias: true,
  preference: 'webgl'
})
```
降級路徑同樣把 `view` 改成 `canvas`：
```ts
await (app as any).init?.({
  canvas: canvasRef.current!,
  width: 300,
  height: 300,
  backgroundAlpha: 0,
  antialias: false,
  preference: 'canvas'
})
```

- 啟動後追加「紅色方塊」偵錯（若沒看到紅方塊，代表真的沒在你看的 canvas 上渲染）：
```ts
const dbg = new PIXI.Graphics()
dbg.beginFill(0xff0000)
dbg.drawRect(10, 10, 50, 50)
dbg.endFill()
app.stage.addChild(dbg)
```

- 若你要更保險，渲染迴圈可顯式掛一個 no-op：
```ts
app.ticker.add(() => {})
```

---

### 7. 我們已做過的穩定性修正
- 別名：已在 `vite.config.ts` 加入 `@assets` 與 `/src/assets` 絕對路徑型別安全設定。
- Sprite 建立順序：「先設貼圖再設尺寸」已修正，避免尺寸無基準造成不可見。
- 失敗備援：若 PIXI 初始化兩次都失敗，或 1.5 秒內偵測不到有效紋理，會自動顯示 `avatar.svg`（IMG）作為備援。

---

### 8. 驗證步驟（修後）
- 刪除瀏覽器快取或硬重新整理。
- Console 應看到：
  - 「PIXI Application init 成功」（或至少沒有錯誤）
  - 「所有 SVG 資源載入完成」或部份成功訊息。
- Network 沒有關鍵 404。
- `__pixiApp.canvas === document.querySelector('canvas.avatar-canvas')` 應為 true。
- 畫面可見：膚色圓頭、兩眼與嘴會有輕微呼吸動畫，偶爾眨眼。

---

### 9. 若仍無法顯示，請回報以下資訊
- Console 全部日誌（含錯誤堆疊）。
- Network 失敗請求清單（特別是 SVG、JS 模組與 `/src/assets/...`）。
- Console 輸出：
  - `__pixiApp?.canvas`, `__pixiApp?.stage?.children?.length`
  - `__avatar?.children?.length`, `__avatar?.getBounds()`
  - `__avatar?.mouth?.texture?.valid`, `__avatar?.eyes?.map(e => e.texture?.valid)`
- 你的作業系統與瀏覽器版本（Windows 10、Edge/Chrome 版本）。

---

簡短總結
- 最可能是 PIXI v7 初始化參數鍵名不正（用到 `view`），導致 PIXI 在另一個看不到的 canvas 上渲染。把 `view` 換成 `canvas` 後，通常即可恢復顯示。其它常見因素包含貼圖設定順序、資源路徑 404 與 CSS 白底造成的「看似空白」。

```typescript
resolve: {
    alias: {
        '@assets': '/src/assets',
        '@eyes': '/src/assets/eyes',
        '@mouth-shapes': '/src/assets/mouth-shapes',
        '@mouth-variants': '/src/assets/mouth-variants'
    }
}
```

```typescript
const app = new PIXI.Application()
await (app as any).init?.({
  canvas: canvasRef.current!,   // 原本是 view: canvasRef.current!
  width: 300,
  height: 300,
  backgroundAlpha: 0,
  antialias: true,
  preference: 'webgl'
})
```

```typescript
await (app as any).init?.({
  canvas: canvasRef.current!,
  width: 300,
  height: 300,
  backgroundAlpha: 0,
  antialias: false,
  preference: 'canvas'
})
```

```typescript
const dbg = new PIXI.Graphics()
dbg.beginFill(0xff0000)
dbg.drawRect(10, 10, 50, 50)
dbg.endFill()
app.stage.addChild(dbg)
```

```typescript
app.ticker.add(() => {})
```

---

**User**

依照這份建議書來進行修正並測試

---

**Cursor**

我先依建議將 PIXI 初始化的參數由 view 改為 canvas，並加入一次性健康檢查，之後會嘗試建置前端以確認沒有編譯錯誤。接著執行建置命令。

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

- 我已把 `AvatarRenderer.tsx` 內兩處 PIXI 初始化參數從 `view` 改為 `canvas`，避免渲染到非 DOM 的隱藏畫布。
- 檢查通過，無新的 Lint 錯誤。

請重新啟動前端開發伺服器或重新整理頁面測試。若仍白畫面：
- 打開 Console 貼上錯誤訊息與以下輸出：
  - `__pixiApp?.canvas === document.querySelector('canvas.avatar-canvas')`
  - `__avatar?.children?.length`
  - `__avatar?.mouth?.texture?.valid`, `__avatar?.eyes?.map(e => e.texture?.valid)`

---

**User**

__pixiApp?.canvas === document.querySelector('canvas.avatar-canvas')
false
__avatar?.mouth?.texture?.valid, __avatar?.eyes?.map(e => e.texture?.valid)
(2) [true, true]0: true1: truelength: 2[[Prototype]]: Array(0)at: ƒ at()concat: ƒ concat()constructor: ƒ Array()copyWithin: ƒ copyWithin()entries: ƒ entries()every: ƒ every()fill: ƒ fill()filter: ƒ filter()find: ƒ find()findIndex: ƒ findIndex()findLast: ƒ findLast()findLastIndex: ƒ findLastIndex()flat: ƒ flat()flatMap: ƒ flatMap()forEach: ƒ forEach()includes: ƒ includes()indexOf: ƒ indexOf()join: ƒ join()keys: ƒ keys()lastIndexOf: ƒ lastIndexOf()length: 0map: ƒ map()pop: ƒ pop()push: ƒ push()reduce: ƒ reduce()reduceRight: ƒ reduceRight()reverse: ƒ reverse()shift: ƒ shift()slice: ƒ slice()some: ƒ some()sort: ƒ sort()splice: ƒ splice()toLocaleString: ƒ toLocaleString()toReversed: ƒ toReversed()toSorted: ƒ toSorted()toSpliced: ƒ toSpliced()toString: ƒ toString()unshift: ƒ unshift()values: ƒ values()with: ƒ with()Symbol(Symbol.iterator): ƒ values()Symbol(Symbol.unscopables): {at: true, copyWithin: true, entries: true, fill: true, find: true, …}[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
__avatar?.children?.length
5

---

**Cursor**

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，將其替換到 DOM 中的占位 canvas
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined = (app as any).canvas
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        canvasRef.current.replaceWith(pixiCanvas)
                        ; (canvasRef as any).current = pixiCanvas
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣確保使用 PIXI 的實際 canvas
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined = (app as any).canvas
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            canvasRef.current.replaceWith(pixiCanvas)
                            ; (canvasRef as any).current = pixiCanvas
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

- 你的回傳顯示 mouth 與 eyes 的紋理都是 valid、`__avatar.children.length = 5`，代表舞台物件與貼圖都正常，但 `__pixiApp?.canvas === document.querySelector('canvas.avatar-canvas')` 為 false，證實 PIXI 仍用它自己的 canvas 渲染，而 DOM 上的 `<canvas>` 是另一個空的白底元素。

- 我已在 `AvatarRenderer.tsx` 初始化成功後，強制把 PIXI 的實際 `canvas` 替換進 DOM，占用原本的 `<canvas>` 位置，確保你看到的就是正在渲染的畫布。降級初始化路徑也做了相同處理。

- 請重新整理後再測：
  - `__pixiApp?.canvas === document.querySelector('canvas.avatar-canvas')` 應為 true
  - 畫面會看到頭、眼、嘴與呼吸/眨眼動畫

- 若仍為 false，請貼 Console 的初始化相關日誌，我再加上更嚴格的綁定方式。

---

**User**

仍然為false：
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
App.tsx:25 LIFF 初始化完成
svgLoader.ts:93 資源載入成功: D
svgLoader.ts:93 資源載入成功: C
svgLoader.ts:93 資源載入成功: E
svgLoader.ts:93 資源載入成功: F
svgLoader.ts:93 資源載入成功: G
svgLoader.ts:93 資源載入成功: A
svgLoader.ts:93 資源載入成功: H
svgLoader.ts:93 資源載入成功: B
svgLoader.ts:93 資源載入成功: blink
svgLoader.ts:93 資源載入成功: happy
svgLoader.ts:78 所有 SVG 資源載入完成
AvatarRenderer.tsx:232 SVG 資源預載入完成
__pixiApp?.canvas === document.querySelector('canvas.avatar-canvas')
false

---

**Cursor**

我先強化 `AvatarRenderer.tsx` 的 canvas 綁定：同時嘗試 `app.renderer.canvas`、`app.renderer.view`、`app.canvas`、`app.view`，並在成功取到時以該 canvas 取代 DOM 內的 `<canvas>`。然後你重新整理並用以下兩個比較來驗證：
- `__pixiApp?.renderer?.canvas === document.querySelector('canvas.avatar-canvas')`
- `__pixiApp?.canvas === document.querySelector('canvas.avatar-canvas')`（若有別名）
我會先套用程式碼編輯。

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，將其替換到 DOM 中的占位 canvas
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        canvasRef.current.replaceWith(pixiCanvas)
                        ; (canvasRef as any).current = pixiCanvas
                        console.log('已綁定 PIXI 實際 canvas 到 DOM')
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣確保使用 PIXI 的實際 canvas
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            canvasRef.current.replaceWith(pixiCanvas)
                            ; (canvasRef as any).current = pixiCanvas
                            console.log('已綁定 PIXI 實際 canvas 到 DOM (降級)')
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

- 我已加強初始化後的綁定邏輯，現在會從 `app.renderer.canvas`、`app.renderer.view`、`app.canvas`、`app.view` 依序取到 PIXI 真正使用的 canvas，並取代 DOM 內的 `<canvas>`。成功時會在 Console 出現「已綁定 PIXI 實際 canvas 到 DOM」字樣（降級分支則是「已綁定 PIXI 實際 canvas 到 DOM (降級)」）。

- 請重新整理並在 Console 驗證：
  - `__pixiApp?.renderer?.canvas === document.querySelector('canvas.avatar-canvas')`
  - `__pixiApp?.canvas === document.querySelector('canvas.avatar-canvas')`
  - 預期至少第一個會變成 true，畫面也應會開始顯示 Avatar 動畫。

- 若仍為 false，請在 Console 執行並貼回結果：
  - `__pixiApp && { hasRenderer: !!__pixiApp.renderer, keys: Object.keys(__pixiApp), rendererKeys: __pixiApp.renderer ? Object.keys(__pixiApp.renderer) : [] }`
  - 以及觀察是否出現我新增的「已綁定 PIXI 實際 canvas 到 DOM」日誌。

---

**User**

chunk-PJEEZAML.js?v=579d8618:8456 Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
    at removeChild (chunk-PJEEZAML.js?v=579d8618:8456:26)
    at commitDeletionEffectsOnFiber (chunk-PJEEZAML.js?v=579d8618:17510:21)
    at commitDeletionEffects (chunk-PJEEZAML.js?v=579d8618:17477:13)
    at recursivelyTraverseMutationEffects (chunk-PJEEZAML.js?v=579d8618:17674:17)
    at commitMutationEffectsOnFiber (chunk-PJEEZAML.js?v=579d8618:17737:15)
    at recursivelyTraverseMutationEffects (chunk-PJEEZAML.js?v=579d8618:17685:15)
    at commitMutationEffectsOnFiber (chunk-PJEEZAML.js?v=579d8618:17699:15)
    at recursivelyTraverseMutationEffects (chunk-PJEEZAML.js?v=579d8618:17685:15)
    at commitMutationEffectsOnFiber (chunk-PJEEZAML.js?v=579d8618:17737:15)
    at recursivelyTraverseMutationEffects (chunk-PJEEZAML.js?v=579d8618:17685:15)

---

**Cursor**

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                            ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

- 錯誤 NotFoundError 是 React 在 commit 刪除節點時，發現要刪除的節點已不在原父層下，通常是因為我們把 React 管理的 `<canvas>` 直接 replace/remove，導致 React 的 DOM 樹和實際 DOM 不一致。

- 我已修改策略：不再 replace 由 React 控管的 `<canvas>`，而是把 PIXI 的實際 canvas 以 append 的方式加到同一父層，並把 React 的 `<canvas>` 隱藏。卸載時我會自行把附加的 PIXI canvas 移除，恢復 React canvas 顯示，避免 NotFoundError。

請重新整理並查看：
- Console 會出現「已附加 PIXI 實際 canvas 到 DOM」或「(降級)」訊息。
- 驗證：
  - `document.querySelectorAll('canvas.avatar-canvas').length` 可能為 2（React 的隱藏 + PIXI 的實際），這是預期。
  - `window.__pixiCanvas === document.querySelectorAll('canvas.avatar-canvas')[1]` 應為 true。
  - 畫面應能看到 Avatar 動畫。

若仍有異常，請提供：
- `document.querySelectorAll('canvas.avatar-canvas').length` 的值
- 任一 `<canvas.avatar-canvas>` 的 `width/height` 與 `getBoundingClientRect()` 結果
- 是否有我新增的「已附加 PIXI 實際 canvas 到 DOM」日誌

---

**User**

好像隱約可以看到canvas 框的右下角有圖在動，可以幫忙位移嗎

---

**Cursor**

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中
            centerAvatarInCanvas(app, avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（考慮邊界變化）
                    centerAvatarInCanvas(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中
            centerAvatarInCanvas(app, avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（考慮邊界變化）
                    centerAvatarInCanvas(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 讓 avatar 置中並有安全邊界
    const centerAvatarInCanvas = (app: PIXI.Application, avatar: PIXI.Container) => {
        const padding = 10
        const bounds = avatar.getBounds()
        // 若尚無有效 bounds，使用畫布中心
        if (!bounds || !isFinite(bounds.width) || !isFinite(bounds.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        avatar.x = Math.round(app.screen.width / 2)
        avatar.y = Math.round(app.screen.height / 2)
        // 確保完整可視（如右下角被裁切）
        const overRight = (bounds.x + bounds.width) - (app.screen.width - padding)
        const overBottom = (bounds.y + bounds.height) - (app.screen.height - padding)
        const overLeft = padding - bounds.x
        const overTop = padding - bounds.y
        let offsetX = 0
        let offsetY = 0
        if (overRight > 0) offsetX -= overRight
        if (overBottom > 0) offsetY -= overBottom
        if (overLeft > 0) offsetX += overLeft
        if (overTop > 0) offsetY += overTop
        avatar.x += offsetX
        avatar.y += offsetY
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中
            centerAvatarInCanvas(app, avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（考慮邊界變化）
                    centerAvatarInCanvas(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 讓 avatar 置中並有安全邊界
    const centerAvatarInCanvas = (app: PIXI.Application, avatar: PIXI.Container) => {
        const padding = 10
        const bounds = avatar.getBounds()
        // 若尚無有效 bounds，使用畫布中心
        if (!bounds || !isFinite(bounds.width) || !isFinite(bounds.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        avatar.x = Math.round(app.screen.width / 2)
        avatar.y = Math.round(app.screen.height / 2)
        // 確保完整可視（如右下角被裁切）
        const overRight = (bounds.x + bounds.width) - (app.screen.width - padding)
        const overBottom = (bounds.y + bounds.height) - (app.screen.height - padding)
        const overLeft = padding - bounds.x
        const overTop = padding - bounds.y
        let offsetX = 0
        let offsetY = 0
        if (overRight > 0) offsetX -= overRight
        if (overBottom > 0) offsetY -= overBottom
        if (overLeft > 0) offsetX += overLeft
        if (overTop > 0) offsetY += overTop
        avatar.x += offsetX
        avatar.y += offsetY
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（小偏移時修正）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                const bounds = avatar.getBounds()
                if (bounds) {
                    const padding = 8
                    const needAdjust =
                        bounds.x < padding ||
                        bounds.y < padding ||
                        bounds.x + bounds.width > app.screen.width - padding ||
                        bounds.y + bounds.height > app.screen.height - padding
                    if (needAdjust) {
                        centerAvatarInCanvas(app, avatar)
                    }
                }
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

- 我已新增置中與邊界校正：
  - 建立後立即置中。
  - 資源貼圖完成後再置中一次。
  - 在動畫迴圈中偵測是否有超出畫布邊界，必要時微調位置，避免落在右下角。

- 你的畫面現在應該會把 Avatar 移回 300×300 畫布中間。

若仍偏移，請回傳以下值以便我精準微調：
- `__avatar.getBounds()`
- `__pixiApp.screen` 與 `__pixiApp.renderer.resolution`

---

**User**

還是有位移，幫我把AVATAR 素材抓取中心點對準CANVAS的 300 x 300 中心點

---

**Cursor**

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 讓 avatar 置中並有安全邊界
    const centerAvatarInCanvas = (app: PIXI.Application, avatar: PIXI.Container) => {
        const padding = 10
        const bounds = avatar.getBounds()
        // 若尚無有效 bounds，使用畫布中心
        if (!bounds || !isFinite(bounds.width) || !isFinite(bounds.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        avatar.x = Math.round(app.screen.width / 2)
        avatar.y = Math.round(app.screen.height / 2)
        // 確保完整可視（如右下角被裁切）
        const overRight = (bounds.x + bounds.width) - (app.screen.width - padding)
        const overBottom = (bounds.y + bounds.height) - (app.screen.height - padding)
        const overLeft = padding - bounds.x
        const overTop = padding - bounds.y
        let offsetX = 0
        let offsetY = 0
        if (overRight > 0) offsetX -= overRight
        if (overBottom > 0) offsetY -= overBottom
        if (overLeft > 0) offsetX += overLeft
        if (overTop > 0) offsetY += overTop
        avatar.x += offsetX
        avatar.y += offsetY
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（小偏移時修正）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                const bounds = avatar.getBounds()
                if (bounds) {
                    const padding = 8
                    const needAdjust =
                        bounds.x < padding ||
                        bounds.y < padding ||
                        bounds.x + bounds.width > app.screen.width - padding ||
                        bounds.y + bounds.height > app.screen.height - padding
                    if (needAdjust) {
                        centerAvatarInCanvas(app, avatar)
                    }
                }
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 以內容的幾何中心對齊畫布中心
    const centerAvatarByPivot = (app: PIXI.Application, avatar: PIXI.Container) => {
        const b = avatar.getBounds()
        if (!b || !isFinite(b.width) || !isFinite(b.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        const contentCenterX = b.x + b.width / 2
        const contentCenterY = b.y + b.height / 2
        const dx = app.screen.width / 2 - contentCenterX
        const dy = app.screen.height / 2 - contentCenterY
        avatar.x += dx
        avatar.y += dy
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（小偏移時修正）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                const bounds = avatar.getBounds()
                if (bounds) {
                    const padding = 8
                    const needAdjust =
                        bounds.x < padding ||
                        bounds.y < padding ||
                        bounds.x + bounds.width > app.screen.width - padding ||
                        bounds.y + bounds.height > app.screen.height - padding
                    if (needAdjust) {
                        centerAvatarInCanvas(app, avatar)
                    }
                }
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 開發下的可視化偵錯背景，協助確認是否有在繪製（不影響正式）
            if ((import.meta as any).env?.DEV) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if ((import.meta as any).env?.DEV) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 以內容的幾何中心對齊畫布中心
    const centerAvatarByPivot = (app: PIXI.Application, avatar: PIXI.Container) => {
        const b = avatar.getBounds()
        if (!b || !isFinite(b.width) || !isFinite(b.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        const contentCenterX = b.x + b.width / 2
        const contentCenterY = b.y + b.height / 2
        const dx = app.screen.width / 2 - contentCenterX
        const dy = app.screen.height / 2 - contentCenterY
        avatar.x += dx
        avatar.y += dy
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（以幾何中心精準對齊）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                centerAvatarByPivot(app, avatar)
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

- 我已改為使用「幾何中心對齊」：每次建立後、資源就緒後、以及在動畫迴圈中，都會計算 `avatar.getBounds()` 的中心，將其平移到畫布中心 (300x300 的正中間)。這能修正右下角偏移的問題。

- 現在應該可以看到頭、眼、嘴都在畫布中央，並持續保持置中。

若仍有偏差，請在 Console 回傳以下數值：
- `__avatar.getBounds()` 的 `x,y,width,height`
- `__pixiApp.screen.width`, `__pixiApp.screen.height`, `__pixiApp.renderer.resolution`

---

**User**

你有看到黑底中右下角有藍底嗎

---

**Cursor**

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href
const SHOW_DEBUG_OVERLAY = false

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 可視化偵錯背景（預設關閉）
            if (SHOW_DEBUG_OVERLAY) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                dbg.x = app.screen.width / 2
                dbg.y = app.screen.height / 2
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if (SHOW_DEBUG_OVERLAY) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 以內容的幾何中心對齊畫布中心
    const centerAvatarByPivot = (app: PIXI.Application, avatar: PIXI.Container) => {
        const b = avatar.getBounds()
        if (!b || !isFinite(b.width) || !isFinite(b.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        const contentCenterX = b.x + b.width / 2
        const contentCenterY = b.y + b.height / 2
        const dx = app.screen.width / 2 - contentCenterX
        const dy = app.screen.height / 2 - contentCenterY
        avatar.x += dx
        avatar.y += dy
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（以幾何中心精準對齊）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                centerAvatarByPivot(app, avatar)
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

看到了。那塊藍灰色的半透明方塊其實是我之前為了偵錯加的「可視化背景」疊層，原本只在開發模式顯示，但你這邊仍然看到它。剛才我已把這段偵錯疊層改成預設完全關閉，不會再干擾畫面。

請重新整理頁面檢查是否還有藍底。如仍出現，回覆我：
- `document.querySelectorAll('canvas.avatar-canvas').length`
- 以及兩個 `<canvas>` 的 `style.background` 值和大小，我再把可能的 CSS 背景或 tint 一次清除。

---

**User**

把可視化背景疊層往左上位移各100像素

---

**Cursor**

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href
const SHOW_DEBUG_OVERLAY = true

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 可視化偵錯背景（預設關閉）
            if (SHOW_DEBUG_OVERLAY) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                // 往左上各位移 100px
                dbg.x = app.screen.width / 2 - 100
                dbg.y = app.screen.height / 2 - 100
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if (SHOW_DEBUG_OVERLAY) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 以內容的幾何中心對齊畫布中心
    const centerAvatarByPivot = (app: PIXI.Application, avatar: PIXI.Container) => {
        const b = avatar.getBounds()
        if (!b || !isFinite(b.width) || !isFinite(b.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        const contentCenterX = b.x + b.width / 2
        const contentCenterY = b.y + b.height / 2
        const dx = app.screen.width / 2 - contentCenterX
        const dy = app.screen.height / 2 - contentCenterY
        avatar.x += dx
        avatar.y += dy
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（以幾何中心精準對齊）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                centerAvatarByPivot(app, avatar)
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

已將偵錯用的可視化背景疊層啟用，並往左上各位移 100 像素。你現在應該會看到那塊半透明矩形相對於畫布中心偏左上 100px。

若要關閉疊層，只需把檔案內的常數改回：
- `const SHOW_DEBUG_OVERLAY = false`

---

**User**

除了可視化圖層，畫面還有一個會動的檔案，也一同位移100像素

---

**Cursor**

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href
const SHOW_DEBUG_OVERLAY = true
const DEBUG_OFFSET_X = -100
const DEBUG_OFFSET_Y = -100

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 可視化偵錯背景（預設關閉）
            if (SHOW_DEBUG_OVERLAY) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                // 往左上各位移 100px
                dbg.x = app.screen.width / 2 + DEBUG_OFFSET_X
                dbg.y = app.screen.height / 2 + DEBUG_OFFSET_Y
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if (SHOW_DEBUG_OVERLAY) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 以內容的幾何中心對齊畫布中心
    const centerAvatarByPivot = (app: PIXI.Application, avatar: PIXI.Container) => {
        const b = avatar.getBounds()
        if (!b || !isFinite(b.width) || !isFinite(b.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        const contentCenterX = b.x + b.width / 2
        const contentCenterY = b.y + b.height / 2
        const dx = app.screen.width / 2 - contentCenterX
        const dy = app.screen.height / 2 - contentCenterY
        avatar.x += dx
        avatar.y += dy
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（以幾何中心精準對齊）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                centerAvatarByPivot(app, avatar)
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href
const SHOW_DEBUG_OVERLAY = true
const DEBUG_OFFSET_X = -100
const DEBUG_OFFSET_Y = -100

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 可視化偵錯背景（預設關閉）
            if (SHOW_DEBUG_OVERLAY) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                // 往左上各位移 100px
                dbg.x = app.screen.width / 2 + DEBUG_OFFSET_X
                dbg.y = app.screen.height / 2 + DEBUG_OFFSET_Y
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if (SHOW_DEBUG_OVERLAY) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 以內容的幾何中心對齊畫布中心
    const centerAvatarByPivot = (app: PIXI.Application, avatar: PIXI.Container) => {
        const b = avatar.getBounds()
        if (!b || !isFinite(b.width) || !isFinite(b.height)) {
            avatar.x = app.screen.width / 2
            avatar.y = app.screen.height / 2
            return
        }
        const contentCenterX = b.x + b.width / 2
        const contentCenterY = b.y + b.height / 2
        const dx = app.screen.width / 2 - contentCenterX
        const dy = app.screen.height / 2 - contentCenterY
        avatar.x += dx
        avatar.y += dy
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（以幾何中心精準對齊）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                centerAvatarByPivot(app, avatar)
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href
const SHOW_DEBUG_OVERLAY = true
const DEBUG_OFFSET_X = -100
const DEBUG_OFFSET_Y = -100

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 可視化偵錯背景（預設關閉）
            if (SHOW_DEBUG_OVERLAY) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                // 往左上各位移 100px
                dbg.x = app.screen.width / 2 + DEBUG_OFFSET_X
                dbg.y = app.screen.height / 2 + DEBUG_OFFSET_Y
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if (SHOW_DEBUG_OVERLAY) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 以內容的幾何中心對齊畫布中心
    const centerAvatarByPivot = (app: PIXI.Application, avatar: PIXI.Container) => {
        const b = avatar.getBounds()
        if (!b || !isFinite(b.width) || !isFinite(b.height)) {
            avatar.x = app.screen.width / 2 + DEBUG_OFFSET_X
            avatar.y = app.screen.height / 2 + DEBUG_OFFSET_Y
            return
        }
        const contentCenterX = b.x + b.width / 2
        const contentCenterY = b.y + b.height / 2
        const dx = app.screen.width / 2 + DEBUG_OFFSET_X - contentCenterX
        const dy = app.screen.height / 2 + DEBUG_OFFSET_Y - contentCenterY
        avatar.x += dx
        avatar.y += dy
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（以幾何中心精準對齊）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                centerAvatarByPivot(app, avatar)
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

- 我已把「會動的圖層」（整個 Avatar 容器）也一併位移到左上 100 像素，與可視化背景保持一致。
- 實作方式：新增偏移常數 `DEBUG_OFFSET_X = -100`, `DEBUG_OFFSET_Y = -100`，並在兩處套用：
  - 可視化背景 `dbg.x/y = center + DEBUG_OFFSET_X/Y`
  - 內容幾何中心對齊時的定位 `centerAvatarByPivot(...)` 也加上相同偏移

如果你要調整量，只需改動常數即可；要回到正中心，把兩個常數改為 0。

---

**User**

再向左位移100像素

---

**Cursor**

我會把偏移常數 `DEBUG_OFFSET_X` 往左再增加 100 像素（從 -100 改為 -200），讓可視化疊層與整個 Avatar 一起再左移。隨後檢查是否有 Lint 問題。

```typescriptreact
import React, { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { svgLoader } from '../services/svgLoader'
import {
    mouthAnimationService,
    eyeAnimationService,
    headAnimationService
} from '../services/animationService'
import './AvatarRenderer.css'
// 使用動態 import 避免沒有 svg 型別宣告
const avatarFallbackUrl = new URL('/src/assets/avatar.svg', import.meta.url).href
const SHOW_DEBUG_OVERLAY = true
const DEBUG_OFFSET_X = -200
const DEBUG_OFFSET_Y = -100

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    currentMouthShape: string
    currentEyeState: string
}

interface AnimationScript {
    duration: number
    mouth_shapes: Array<{
        start: number
        end: number
        shape: string
    }>
    head_movements: Array<{
        start: number
        end: number
        type: string
        intensity: number
    }>
}

interface AvatarRendererProps {
    animationScript?: AnimationScript
    audioUrl?: string
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
    animationScript,
    audioUrl
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const avatarRef = useRef<AvatarContainer | null>(null)
    const animationRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const pixiCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // 狀態管理
    const [isLoading, setIsLoading] = useState(true)
    const [loadingProgress, setLoadingProgress] = useState(0)
    const [currentMouthShape, setCurrentMouthShape] = useState('X')
    const [currentEyeState, setCurrentEyeState] = useState('normal')
    const [loadingStatus, setLoadingStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [useImageFallback, setUseImageFallback] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        let destroyed = false

        const boot = async () => {
            // 優先使用較新的初始化 API，失敗時降級重試
            try {
                const app = new PIXI.Application()
                await (app as any).init?.({
                    canvas: canvasRef.current!,
                    width: 300,
                    height: 300,
                    backgroundAlpha: 0,
                    antialias: true,
                    preference: 'webgl'
                })
                if (destroyed) { app.destroy(true); return }
                appRef.current = app
                    // 確保渲染迴圈啟動
                    ; (app as any).start?.()

                // 若 PIXI 仍然自己創建了 canvas，改為附加在 React canvas 的父層，避免直接置換造成 React DOM 異常
                try {
                    const pixiCanvas: HTMLCanvasElement | undefined =
                        (app as any).renderer?.canvas ||
                        (app as any).renderer?.view ||
                        (app as any).canvas ||
                        (app as any).view
                    if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                        pixiCanvas.className = 'avatar-canvas'
                        pixiCanvas.style.display = 'block'
                        pixiCanvas.width = 300
                        pixiCanvas.height = 300
                        const parent = canvasRef.current.parentElement
                        if (parent) {
                            parent.appendChild(pixiCanvas)
                            canvasRef.current.style.display = 'none'
                            pixiCanvasRef.current = pixiCanvas
                                ; (window as any).__pixiCanvas = pixiCanvas
                            console.log('已附加 PIXI 實際 canvas 到 DOM（保留 React canvas 以避免移除錯誤）')
                        }
                    }
                } catch { /* noop */ }
            } catch (e) {
                console.warn('PIXI Application init 失敗，嘗試降級參數後重試:', e)
                try {
                    const app = new PIXI.Application()
                    await (app as any).init?.({
                        canvas: canvasRef.current!,
                        width: 300,
                        height: 300,
                        backgroundAlpha: 0,
                        antialias: false,
                        preference: 'canvas' // 強制使用 Canvas2D
                    })
                    if (destroyed) { app.destroy(true); return }
                    appRef.current = app
                        ; (app as any).start?.()

                    // 降級情況同樣將 PIXI 的實際 canvas 附加到 DOM
                    try {
                        const pixiCanvas: HTMLCanvasElement | undefined =
                            (app as any).renderer?.canvas ||
                            (app as any).renderer?.view ||
                            (app as any).canvas ||
                            (app as any).view
                        if (pixiCanvas && canvasRef.current && pixiCanvas !== canvasRef.current) {
                            pixiCanvas.className = 'avatar-canvas'
                            pixiCanvas.style.display = 'block'
                            pixiCanvas.width = 300
                            pixiCanvas.height = 300
                            const parent = canvasRef.current.parentElement
                            if (parent) {
                                parent.appendChild(pixiCanvas)
                                canvasRef.current.style.display = 'none'
                                pixiCanvasRef.current = pixiCanvas
                                    ; (window as any).__pixiCanvas = pixiCanvas
                                console.log('已附加 PIXI 實際 canvas 到 DOM (降級)')
                            }
                        }
                    } catch { /* noop */ }
                } catch (e2) {
                    console.error('PIXI Application 降級後仍初始化失敗:', e2)
                    // 切換為圖片備援
                    setLoadingStatus('error')
                    setUseImageFallback(true)
                    setIsLoading(false)
                    return
                }
            }

            const app = appRef.current!

            // 可視化偵錯背景（預設關閉）
            if (SHOW_DEBUG_OVERLAY) {
                const dbg = new PIXI.Graphics()
                dbg.beginFill(0x3399ff, 0.12)
                dbg.drawRoundedRect(-150, -150, 300, 300, 16)
                dbg.endFill()
                // 往左上各位移 100px
                dbg.x = app.screen.width / 2 + DEBUG_OFFSET_X
                dbg.y = app.screen.height / 2 + DEBUG_OFFSET_Y
                app.stage.addChild(dbg)
            }
            // 先建立 Avatar，立即提供可視回饋；SVG 預載改為背景進行
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            createOptimizedAvatar(avatar)
            // 初次置中（以內容幾何中心對齊畫布中心）
            centerAvatarByPivot(app, avatar)
            if (SHOW_DEBUG_OVERLAY) {
                const dot = new PIXI.Graphics()
                dot.beginFill(0xff0000)
                dot.drawCircle(0, 0, 4)
                dot.endFill()
                avatar.addChild(dot)
            }
            ; (window as any).__pixiApp = app
                ; (window as any).__avatar = avatar

            // 開始閒置動畫並快速結束載入畫面
            startIdleAnimation()
            setLoadingStatus('success')
            setTimeout(() => setIsLoading(false), 300)

            // 若一定時間內仍無有效紋理，視為渲染失敗，切換圖片備援
            setTimeout(() => {
                if (useImageFallback) return
                const avatar = avatarRef.current
                if (!avatar) return
                const mouthTex: any = avatar.mouth?.texture as any
                const [le, re] = avatar.eyes || []
                const leTex: any = (le as any)?.texture
                const reTex: any = (re as any)?.texture
                const hasValid = Boolean(
                    (mouthTex && (mouthTex.valid || mouthTex.baseTexture?.valid)) ||
                    (leTex && (leTex.valid || leTex.baseTexture?.valid)) ||
                    (reTex && (reTex.valid || reTex.baseTexture?.valid))
                )
                if (!hasValid) {
                    console.warn('Avatar 紋理未就緒，切換為圖片備援')
                    setUseImageFallback(true)
                }
            }, 1500)

            // 在背景預載 SVG，完成後套用最終紋理
            preloadSVGResources()
                .then(() => {
                    if (!avatarRef.current) return
                    // 套用最新紋理
                    updateMouthTexture(avatarRef.current.mouth, avatarRef.current.currentMouthShape)
                    const [le, re] = avatarRef.current.eyes
                    updateEyeTexture(le, avatarRef.current.currentEyeState)
                    updateEyeTexture(re, avatarRef.current.currentEyeState)
                    // 紋理就緒後再置中一次（以幾何中心為基準）
                    centerAvatarByPivot(appRef.current!, avatarRef.current)
                })
                .catch(() => {
                    // 背景載入失敗也不阻塞初始回饋
                    console.warn('背景載入 SVG 失敗，使用備援紋理')
                })
        }

        void boot()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (appRef.current) {
                ; (appRef.current as any).stop?.()
                appRef.current.destroy(true)
            }
            // 移除我們額外附加的 PIXI canvas，避免 React 卸載時發生 DOM 不一致
            try {
                if (pixiCanvasRef.current && pixiCanvasRef.current.parentElement) {
                    pixiCanvasRef.current.parentElement.removeChild(pixiCanvasRef.current)
                }
                if (canvasRef.current) {
                    canvasRef.current.style.display = 'block'
                }
            } catch { /* noop */ }
            // 清理 SVG 載入器
            svgLoader.cleanup()
            destroyed = true
        }
    }, [])

    // 預載入 SVG 資源
    const preloadSVGResources = async () => {
        try {
            // 開始載入進度監控
            const progressInterval = setInterval(() => {
                setLoadingProgress(svgLoader.getLoadingProgress())
            }, 100)

            // 預載入所有資源
            await svgLoader.preloadAll()

            clearInterval(progressInterval)
            setLoadingProgress(1)

            console.log('SVG 資源預載入完成')
        } catch (error) {
            console.warn('SVG 資源載入失敗:', error)
            throw error
        }
    }

    // 以內容的幾何中心對齊畫布中心
    const centerAvatarByPivot = (app: PIXI.Application, avatar: PIXI.Container) => {
        const b = avatar.getBounds()
        if (!b || !isFinite(b.width) || !isFinite(b.height)) {
            avatar.x = app.screen.width / 2 + DEBUG_OFFSET_X
            avatar.y = app.screen.height / 2 + DEBUG_OFFSET_Y
            return
        }
        const contentCenterX = b.x + b.width / 2
        const contentCenterY = b.y + b.height / 2
        const dx = app.screen.width / 2 + DEBUG_OFFSET_X - contentCenterX
        const dy = app.screen.height / 2 + DEBUG_OFFSET_Y - contentCenterY
        avatar.x += dx
        avatar.y += dy
    }

    // 處理動畫腳本
    useEffect(() => {
        if (animationScript && !isLoading) {
            // 沒有音訊時，仍然以腳本時間驅動動畫，確保 Phase 1 有回饋
            startTalkingAnimation(animationScript, audioUrl || '')
        }
    }, [animationScript, audioUrl, isLoading])

    const createOptimizedAvatar = (container: AvatarContainer) => {
        // 頭部（先用簡單圖形，等資源預載完成後再換成 avatar-head.svg）
        const head = new PIXI.Graphics()
        head.beginFill(0xffcba0)
        head.lineStyle(2, 0x8a5a44, 1)
        head.drawCircle(0, -10, 100)
        head.endFill()
        container.addChild(head)

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 更新嘴型紋理
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        const texture = svgLoader.getTexture(shape)
        if (texture) {
            mouth.texture = texture
        }
    }

    // 更新眼睛紋理
    const updateEyeTexture = (eye: PIXI.Sprite, state: string) => {
        const texture = svgLoader.getTexture(state)
        if (texture) {
            eye.texture = texture
        }
    }

    const startIdleAnimation = () => {
        if (!avatarRef.current) return

        let time = 0
        const animate = () => {
            time += 0.016 // 約 60fps

            // 呼吸動畫
            const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            avatarRef.current!.scale.set(breathScale)

            // 優化後的眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每幀校正位置（以幾何中心精準對齊）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                centerAvatarByPivot(app, avatar)
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]

        // 使用動畫服務執行眨眼
        eyes.forEach(eye => {
            eyeAnimationService.animateBlink(eye, 250, () => {
                // 眨眼完成後恢復正常狀態
                updateEyeTexture(eye, 'normal')
            })
        })
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true
            audio.src = audioUrl
            audioRef.current = audio
            // 盡量在使用者互動後觸發的同一循環內播放；若被瀏覽器阻擋，記錄原因
            audio.play().catch((err) => {
                console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
            })
            audio.addEventListener('error', () => {
                console.warn('音訊資源載入失敗：', audio.error)
            })
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            const currentTime = (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            if (currentTime < script.duration) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束，回到閒置狀態
                if (audioRef.current) {
                    audioRef.current.pause()
                }
                startIdleAnimation()
            }
        }

        animate()
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            // 更新嘴型狀態
            const newShape = currentShape.shape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理
            updateMouthTexture(mouth, newShape)

            // 使用動畫服務執行平滑的嘴型切換
            const targetScale = getMouthScale(newShape)
            mouthAnimationService.animateMouthShape(mouth, targetScale, 150)

            // 為某些嘴型添加震動效果（強調發音）
            if (['A', 'G', 'H'].includes(newShape)) {
                setTimeout(() => {
                    mouthAnimationService.animateMouthVibration(mouth, 0.08, 150)
                }, 100)
            }
        }
    }

    // 獲取嘴型縮放值
    const getMouthScale = (shape: string): number => {
        const shapeMap: { [key: string]: number } = {
            'X': 0.8,  // 閉嘴
            'A': 1.2,  // 張嘴
            'B': 1.1,  // 半張嘴
            'C': 1.0,  // 小張嘴
            'D': 0.95, // 微張嘴
            'E': 0.9,  // 幾乎閉嘴
            'F': 1.05, // 中等張嘴
            'G': 1.15, // 大張嘴
            'H': 1.25  // 最大張嘴
        }
        return shapeMap[shape] || 0.8
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            switch (currentMovement.type) {
                case 'nod':
                    // 使用動畫服務執行點頭
                    headAnimationService.animateNod(
                        avatarRef.current,
                        currentMovement.intensity * 0.1,
                        1000
                    )
                    break
                case 'shake':
                    // 使用動畫服務執行搖頭
                    headAnimationService.animateShake(
                        avatarRef.current,
                        currentMovement.intensity * 0.05,
                        800
                    )
                    break
            }
        }
    }

    return (
        <div style={{ position: 'relative', width: 300, height: 300 }}>
            {useImageFallback ? (
                <img
                    src={avatarFallbackUrl}
                    alt="avatar"
                    width={300}
                    height={300}
                    style={{ display: 'block', width: 300, height: 300 }}
                />
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="avatar-canvas"
                        width={300}
                        height={300}
                        style={{ display: 'block' }}
                    />
                    {isLoading && (
                        <div className={`avatar-loading ${loadingStatus}`} style={{
                            position: 'absolute',
                            inset: 0
                        }}>
                            <div className="status-indicator">
                                <div className="status-dot"></div>
                                <div className="loading-text">
                                    {loadingStatus === 'loading' && '載入中...'}
                                    {loadingStatus === 'success' && '載入完成！'}
                                    {loadingStatus === 'error' && '載入失敗'}
                                </div>
                            </div>

                            <div className="progress-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${loadingProgress * 100}%` }}
                                />
                            </div>

                            <div className="progress-text">
                                {loadingStatus === 'loading' && `${Math.round(loadingProgress * 100)}%`}
                                {loadingStatus === 'success' && '虛擬人準備就緒'}
                                {loadingStatus === 'error' && '請重新整理頁面'}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AvatarRenderer

```

- 已將整體位移再向左 100px：`DEBUG_OFFSET_X` 由 -100 改為 -200。可視化疊層與 Avatar 主體會同步左移。
- 若還需微調，告訴我要再左/右/上/下多少像素；或直接提供你希望的畫面座標位置。

---

**User**

這張AVATAR 是誰給的

---

**Cursor**

- 不是外部提供的人物圖。畫面中的 AVATAR 主要由程式動態產生：
  - 頭部/臉：`AvatarRenderer.tsx` 用 PIXI 直接繪製的佔位圖（圓形頭）。
```258:265:frontend/src/components/AvatarRenderer.tsx
const head = new PIXI.Graphics()
head.beginFill(0xffcba0)
head.lineStyle(2, 0x8a5a44, 1)
head.drawCircle(0, -10, 100)
head.endFill()
container.addChild(head)
```
  - 眼睛/嘴：貼圖來自專案內建 SVG 素材（`frontend/src/assets/...`），在載入器設定中綁定。
```23:41:frontend/src/services/svgLoader.ts
export const MOUTH_SHAPES_CONFIG = {
  'X': { id: 'closed', path: '../assets/mouth-variants/avatar-mouth-closed.svg', loaded: false },
  ...
}
export const EYE_SHAPES_CONFIG = {
  'normal': { id: 'eyes-normal', path: '../assets/eyes/eyes_blink_close.svg', loaded: false },
  'blink': { id: 'eyes-blink', path: '../assets/eyes/eyes_blink_close.svg', loaded: false },
  'happy': { id: 'eyes-happy', path: '../assets/eyes/eyes-blink_sad.svg', loaded: false }
}
```
- 紅色小點是我開的偵錯標記；背景半透明方塊是偵錯疊層。想換成你自己的頭像，可把 `frontend/src/assets/avatar-head.svg` 或 `avatar.svg` 換掉，或告訴我要改成固定貼圖頭部，我幫你改。

```typescriptreact
const head = new PIXI.Graphics()
head.beginFill(0xffcba0)
head.lineStyle(2, 0x8a5a44, 1)
head.drawCircle(0, -10, 100)
head.endFill()
container.addChild(head)
```

```typescript
export const MOUTH_SHAPES_CONFIG = {
  'X': { id: 'closed', path: '../assets/mouth-variants/avatar-mouth-closed.svg', loaded: false },
  ...
}
export const EYE_SHAPES_CONFIG = {
  'normal': { id: 'eyes-normal', path: '../assets/eyes/eyes_blink_close.svg', loaded: false },
  'blink': { id: 'eyes-blink', path: '../assets/eyes/eyes_blink_close.svg', loaded: false },
  'happy': { id: 'eyes-happy', path: '../assets/eyes/eyes-blink_sad.svg', loaded: false }
}
```

