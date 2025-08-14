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
const DEBUG_OFFSET_X = 0
const DEBUG_OFFSET_Y = 0

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
            // 先建立 Avatar，立即提供可視回饋；在建立前先載入 head 紋理，確保優先使用 @assets/avatar.svg
            const avatar = new PIXI.Container() as AvatarContainer
            app.stage.addChild(avatar)
            avatarRef.current = avatar

            // 建立優化後的虛擬人外觀
            try {
                await svgLoader.loadResource('head')
            } catch { }
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
        // 頭部：若有 head 紋理則優先使用並填滿 300x300，否則退回簡單圖形
        const headTexture = svgLoader.getTexture('head')
        if (headTexture) {
            const headSprite = new PIXI.Sprite(headTexture)
            headSprite.anchor.set(0.5)
            // 以 cover 模式縮放至 300x300，保持比例置中
            fitSpriteIntoSquare(headSprite, 300, 'cover')
            headSprite.x = 0
            headSprite.y = 0
            container.addChild(headSprite)
        } else {
            const head = new PIXI.Graphics()
            head.beginFill(0xffcba0)
            head.lineStyle(2, 0x8a5a44, 1)
            head.drawCircle(0, -10, 100)
            head.endFill()
            container.addChild(head)
        }

        // 優化後的眼睛系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const leftEye = new PIXI.Sprite()
        leftEye.anchor.set(0.5)
        updateEyeTexture(leftEye, 'normal')
        leftEye.x = -30
        leftEye.y = -25
        leftEye.width = 24
        leftEye.height = 24
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.anchor.set(0.5)
        updateEyeTexture(rightEye, 'normal')
        rightEye.x = 30
        rightEye.y = -25
        rightEye.width = 24
        rightEye.height = 24
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統（先設定貼圖，再設定尺寸，避免 scale 非法）
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        updateMouthTexture(mouth, 'X')
        mouth.x = 0
        mouth.y = 25
        mouth.width = 50
        mouth.height = 30
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [leftEye, rightEye]
        container.currentMouthShape = 'X'
        container.currentEyeState = 'normal'
    }

    // 將任意貼圖以 cover/contain 模式縮放至方形尺寸
    const fitSpriteIntoSquare = (sprite: PIXI.Sprite, size: number, mode: 'cover' | 'contain' = 'cover') => {
        const tex = sprite.texture
        const w = (tex as any)?.width || tex.baseTexture?.realWidth || tex.baseTexture?.width
        const h = (tex as any)?.height || tex.baseTexture?.realHeight || tex.baseTexture?.height
        if (!w || !h) return
        const scale = mode === 'cover' ? Math.max(size / w, size / h) : Math.min(size / w, size / h)
        sprite.scale.set(scale)
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
