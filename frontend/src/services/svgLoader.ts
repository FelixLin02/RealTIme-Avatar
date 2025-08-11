import * as PIXI from 'pixi.js'

// 以 Vite 的 import.meta.glob 建立資源路徑對映，避免直接 fetch /src 導致 404
// Key 會是相對於本檔案的路徑，例如 '../assets/mouth-shapes/mouth-close.svg'
// Value 會是可直接請求的 URL（開發時為本機伺服器 URL，打包時為指向資產的 URL）
const ASSET_URL_MAP: Record<string, string> = {
    ...import.meta.glob('../assets/**/*.svg', { eager: true, as: 'url' }) as Record<string, string>
}

function resolveAssetUrl(relativePathFromHere: string): string | undefined {
    return ASSET_URL_MAP[relativePathFromHere]
}

// SVG 資源類型定義
export interface SVGResource {
    id: string
    path: string
    texture?: PIXI.Texture
    loaded: boolean
}

// 嘴型資源配置
export const MOUTH_SHAPES_CONFIG: { [key: string]: SVGResource } = {
    // Phase-1 測試：以 mouth-variants 為主（僅三檔）。其餘形狀映射到最接近者。
    'X': { id: 'closed', path: '../assets/mouth-variants/avatar-mouth-closed.svg', loaded: false },
    'C': { id: 'slightly-open', path: '../assets/mouth-variants/avatar-mouth-slightly-open.svg', loaded: false },
    'D': { id: 'slightly-open', path: '../assets/mouth-variants/avatar-mouth-slightly-open.svg', loaded: false },
    'E': { id: 'slightly-open', path: '../assets/mouth-variants/avatar-mouth-slightly-open.svg', loaded: false },
    'B': { id: 'half-open', path: '../assets/mouth-variants/avatar-mouth-half-open.svg', loaded: false },
    'A': { id: 'half-open', path: '../assets/mouth-variants/avatar-mouth-half-open.svg', loaded: false },
    'F': { id: 'half-open', path: '../assets/mouth-variants/avatar-mouth-half-open.svg', loaded: false },
    'G': { id: 'half-open', path: '../assets/mouth-variants/avatar-mouth-half-open.svg', loaded: false },
    'H': { id: 'half-open', path: '../assets/mouth-variants/avatar-mouth-half-open.svg', loaded: false }
}

// 眼睛資源配置
export const EYE_SHAPES_CONFIG: { [key: string]: SVGResource } = {
    'normal': { id: 'eyes-normal', path: '../assets/eyes/eyes_blink_close.svg', loaded: false },
    'blink': { id: 'eyes-blink', path: '../assets/eyes/eyes_blink_close.svg', loaded: false },
    'happy': { id: 'eyes-happy', path: '../assets/eyes/eyes-blink_sad.svg', loaded: false }
}

// SVG 載入器類別
export class SVGLoader {
    private static instance: SVGLoader
    private resources: Map<string, SVGResource> = new Map()
    private loadingPromises: Map<string, Promise<PIXI.Texture>> = new Map()

    private constructor() {
        // 初始化資源映射
        Object.entries(MOUTH_SHAPES_CONFIG).forEach(([key, resource]) => {
            this.resources.set(key, resource)
        })
        Object.entries(EYE_SHAPES_CONFIG).forEach(([key, resource]) => {
            this.resources.set(key, resource)
        })
    }

    public static getInstance(): SVGLoader {
        if (!SVGLoader.instance) {
            SVGLoader.instance = new SVGLoader()
        }
        return SVGLoader.instance
    }

    // 預載入所有資源
    public async preloadAll(): Promise<void> {
        const loadPromises: Promise<void>[] = []

        for (const [key, resource] of this.resources) {
            if (!resource.loaded) {
                loadPromises.push(this.loadResource(key))
            }
        }

        try {
            await Promise.all(loadPromises)
            console.log('所有 SVG 資源載入完成')
        } catch (error) {
            console.warn('部分 SVG 資源載入失敗:', error)
        }
    }

    // 載入單個資源
    public async loadResource(key: string): Promise<void> {
        const resource = this.resources.get(key)
        if (!resource || resource.loaded) return

        try {
            const texture = await this.loadSVGAsTexture(resource.path)
            resource.texture = texture
            resource.loaded = true
            console.log(`資源載入成功: ${key}`)
        } catch (error) {
            console.error(`資源載入失敗: ${key}`, error)
            // 創建備用紋理
            resource.texture = this.createFallbackTexture(key)
            resource.loaded = true
        }
    }

    // 獲取資源紋理
    public getTexture(key: string): PIXI.Texture | undefined {
        const resource = this.resources.get(key)
        if (!resource) return undefined
        if (!resource.texture) {
            // 提供即時備援，避免畫面因等待載入而沒有任何可視回饋
            resource.texture = this.createFallbackTexture(key)
            resource.loaded = true
        }
        return resource.texture
    }

    // 檢查資源是否已載入
    public isResourceLoaded(key: string): boolean {
        const resource = this.resources.get(key)
        return resource?.loaded || false
    }

    // 載入 SVG 為 PIXI 紋理
    private async loadSVGAsTexture(svgPath: string): Promise<PIXI.Texture> {
        try {
            const url = resolveAssetUrl(svgPath)
            if (!url) {
                throw new Error(`找不到資源 URL: ${svgPath}`)
            }

            return new Promise((resolve, reject) => {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => {
                    resolve(PIXI.Texture.from(img))
                }
                img.onerror = () => reject(new Error(`載入失敗: ${url}`))
                img.src = url
            })
        } catch (error) {
            console.error('SVG 載入失敗:', error)
            throw error
        }
    }

    // 創建備用紋理（即使載入失敗也要有可視回饋）
    private createFallbackTexture(key: string): PIXI.Texture {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')!

        // 根據 key 是否屬於嘴或眼的配置，決定畫什麼
        if (Object.prototype.hasOwnProperty.call(MOUTH_SHAPES_CONFIG, key)) {
            this.drawFallbackMouth(ctx, key)
        } else if (Object.prototype.hasOwnProperty.call(EYE_SHAPES_CONFIG, key)) {
            this.drawFallbackEye(ctx, key)
        }

        return PIXI.Texture.from(canvas)
    }

    // 繪製備用嘴型
    private drawFallbackMouth(ctx: CanvasRenderingContext2D, key: string): void {
        ctx.fillStyle = '#8B4513'
        ctx.strokeStyle = '#654321'
        ctx.lineWidth = 2

        if (key.includes('close') || key.includes('X')) {
            // 閉嘴
            ctx.beginPath()
            ctx.ellipse(32, 32, 20, 8, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
        } else if (key.includes('wide') || key.includes('A') || key.includes('G') || key.includes('H')) {
            // 張嘴
            ctx.beginPath()
            ctx.ellipse(32, 32, 20, 15, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
        } else {
            // 半張嘴
            ctx.beginPath()
            ctx.ellipse(32, 32, 20, 12, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
        }
    }

    // 繪製備用眼睛
    private drawFallbackEye(ctx: CanvasRenderingContext2D, key: string): void {
        ctx.fillStyle = '#000000'
        ctx.strokeStyle = '#333333'
        ctx.lineWidth = 1

        if (key.includes('blink')) {
            // 眨眼狀態
            ctx.beginPath()
            ctx.ellipse(32, 32, 12, 2, 0, 0, Math.PI * 2)
            ctx.fill()
        } else {
            // 正常眼睛
            ctx.beginPath()
            ctx.arc(32, 32, 12, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
        }
    }

    // 獲取載入進度
    public getLoadingProgress(): number {
        const total = this.resources.size
        const loaded = Array.from(this.resources.values()).filter(r => r.loaded).length
        return total > 0 ? loaded / total : 0
    }

    // 清理資源
    public cleanup(): void {
        this.resources.clear()
        this.loadingPromises.clear()
    }
}

// 導出單例實例
export const svgLoader = SVGLoader.getInstance()
