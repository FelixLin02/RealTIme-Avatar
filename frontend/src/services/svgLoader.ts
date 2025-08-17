import * as PIXI from 'pixi.js'

// 以 Vite 的 import.meta.glob 建立資源路徑對映，避免直接 fetch /src 導致 404
// Key 會是相對於本檔案的路徑，例如 '../assets/mouth-shapes/mouth-close.svg'
// Value 會是可直接請求的 URL（開發時為本機伺服器 URL，打包時為指向資產的 URL）

// 使用字面量路徑，符合 Vite 的要求
const ASSET_URL_MAP: Record<string, string> = {
    ...((import.meta as any).glob('../assets/**/*.svg', { eager: true, as: 'url' }) as Record<string, string>)
}

// 調試：檢查資源載入狀態
console.log('🔍 ASSET_URL_MAP 內容:', ASSET_URL_MAP)
console.log('🔍 載入的 SVG 檔案數量:', Object.keys(ASSET_URL_MAP).length)
console.log('🔍 載入的 SVG 檔案路徑:', Object.keys(ASSET_URL_MAP))







function resolveAssetUrl(relativePathFromHere: string): string | undefined {
    // 直接匹配
    if (ASSET_URL_MAP[relativePathFromHere]) {
        return ASSET_URL_MAP[relativePathFromHere]
    }

    // 如果沒有直接匹配，嘗試查找包含檔案名的路徑
    const fileName = relativePathFromHere.split('/').pop()
    if (fileName) {
        for (const [path, url] of Object.entries(ASSET_URL_MAP)) {
            if (path.includes(fileName)) {
                return url
            }
        }
    }

    return undefined
}

// SVG 資源類型定義
export interface SVGResource {
    id: string
    path: string
    texture?: PIXI.Texture
    loaded: boolean
}

// 嘴型資源配置（包含所有可用的SVG檔案）
export const MOUTH_SHAPES_CONFIG: { [key: string]: SVGResource } = {
    // 閒置時的嘴型：自然表情
    'X': { id: 'mouth-closed', path: '../assets/mouth-shapes/Avatar-mouth-closed.svg', loaded: false },
    'tight': { id: 'mouth-tight', path: '../assets/mouth-shapes/Avatar-mouth-tight.svg', loaded: false },
    'soft-smile': { id: 'soft-smile', path: '../assets/Avatar-mouth-soft-smile.svg', loaded: false },

    // 說話時的嘴型：Rhubarb 標準名稱（根據實際可用檔案）
    'A': { id: 'mouth-A', path: '../assets/mouth-shapes/Avatar-mouth-A.svg', loaded: false },
    'E': { id: 'mouth-E', path: '../assets/mouth-shapes/Avatar-mouth-E.svg', loaded: false },
    'O': { id: 'mouth-O', path: '../assets/mouth-shapes/Avatar-mouth-O.svg', loaded: false },
    'big-smile': { id: 'big-smile', path: '../assets/mouth-shapes/Avatar-mouth-big-smile.svg', loaded: false }
}

// 眉毛資源配置
export const EYEBROW_RESOURCE: SVGResource = {
    id: 'eye-brow',
    path: '../assets/eyes/Avatar-eye-brow.svg',
    loaded: false
}

// 眼睛資源配置
export const EYE_SHAPES_CONFIG: { [key: string]: SVGResource } = {
    'normal': { id: 'eyes-open', path: '../assets/eyes/Avatar-eyes-open.svg', loaded: false },
    'blink': { id: 'eyes-closed', path: '../assets/eyes/Avatar-eyes-closed.svg', loaded: false },
    'look-left': { id: 'eyes-look-left', path: '../assets/eyes/Avatar-eyes-look-left.svg', loaded: false },
    'look-right': { id: 'eyes-look-right', path: '../assets/eyes/Avatar-eyes-look-right.svg', loaded: false }
}

// 頭部資源（用於 300x300 置中顯示）
export const HEAD_RESOURCE: SVGResource = {
    id: 'head',
    path: '../assets/Avatar-Base.svg',
    loaded: false
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
        // 追加眉毛資源
        this.resources.set('eye-brow', EYEBROW_RESOURCE)
        // 追加頭部資源鍵值 'head'
        this.resources.set('head', HEAD_RESOURCE)
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
            // 載入完成後顯示最終狀態
            this.showFinalStatus()
        } catch (error) {
            console.warn('⚠️ 部分 SVG 資源載入失敗:', error)
            // 即使有錯誤也顯示狀態
            this.showFinalStatus()
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
        } catch (error) {
            console.error(`❌ 資源載入失敗: ${key} (${resource.path})`, error)
            // 創建備用紋理
            resource.texture = this.createFallbackTexture(key)
            resource.loaded = true
        }
    }

    // 獲取資源紋理
    public getTexture(key: string): PIXI.Texture | undefined {
        const resource = this.resources.get(key)

        if (!resource) {
            // 測試階段：靜默處理，不顯示警告
            // console.warn(`⚠️ 資源不存在: ${key}`)
            return undefined
        }
        if (!resource.loaded) {
            // 移除誤導性警告，因為資源可能正在載入中
            return undefined
        }
        if (!resource.texture) {
            // 測試階段：靜默處理，不顯示警告
            // console.warn(`❌ 資源紋理為空: ${key}`)
            return undefined
        }
        // 改為僅在真正載入成功時回傳紋理；未載入時不再使用幾何備援，避免出現幾何眼/圓形
        return resource.texture
    }

    // 檢查資源是否已載入
    public isResourceLoaded(key: string): boolean {
        const resource = this.resources.get(key)
        return resource?.loaded || false
    }

    // 顯示所有資源的最終載入狀態
    public showFinalStatus(): void {
        console.log('📊 資源載入最終狀態:')

        const loaded: string[] = []
        const failed: string[] = []

        for (const [key, resource] of this.resources) {
            if (resource.loaded && resource.texture) {
                loaded.push(key)
            } else {
                failed.push(key)
            }
        }

        if (loaded.length > 0) {
            console.log(`✅ 已載入 (${loaded.length}):`, loaded.join(', '))
        }

        if (failed.length > 0) {
            console.log(`❌ 載入失敗 (${failed.length}):`, failed.join(', '))
        }

        console.log(`📈 總計: ${this.resources.size} 個資源`)
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
