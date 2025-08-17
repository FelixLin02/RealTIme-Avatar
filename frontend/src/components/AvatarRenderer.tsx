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
const HIDE_HEAD_BASE = true
const DEBUG_OFFSET_X = 0
const DEBUG_OFFSET_Y = 0

interface AvatarContainer extends PIXI.Container {
    mouth: PIXI.Sprite
    eyes: PIXI.Sprite[]
    eyebrows: PIXI.Sprite
    currentMouthShape: string
    currentEyeState: string
    isTalking?: boolean  // 說話動畫標識
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
                    ; (app as any).renderer?.resize?.(300, 300)

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
                        ; (app as any).renderer?.resize?.(300, 300)

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
            // 視窗縮放時重新置中
            const onResize = () => centerAvatarByPivot(app, avatar)
            window.addEventListener('resize', onResize)
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
                    // 套用最新紋理（此時一定要拿真實紋理）
                    const eyebrowsTex2 = svgLoader.getTexture('eye-brow')
                    if (eyebrowsTex2) {
                        avatarRef.current.eyebrows.texture = eyebrowsTex2
                        Object.assign(avatarRef.current.eyebrows, { visible: true, width: 300, height: 300, x: 0, y: 0 })
                    }
                    const mTex2 = svgLoader.getTexture('soft-smile') || svgLoader.getTexture('X')
                    if (mTex2) {
                        avatarRef.current.mouth.texture = mTex2
                        Object.assign(avatarRef.current.mouth, { visible: true, width: 300, height: 300, x: 0, y: 0 })
                    }
                    const eyesTex2 = svgLoader.getTexture('normal')
                    if (eyesTex2) {
                        avatarRef.current.eyes[0].texture = eyesTex2
                        avatarRef.current.eyes[0].visible = true
                        avatarRef.current.eyes[0].width = 300
                        avatarRef.current.eyes[0].height = 300
                        avatarRef.current.eyes[0].x = 0
                        avatarRef.current.eyes[0].y = 0
                    }
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
            window.removeEventListener('resize', () => { })
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
            fitSpriteIntoSquare(headSprite, 300, 'cover')
            headSprite.x = 0
            headSprite.y = 0
            // 僅隱藏系統幾何頭，不隱藏你的 Avatar-Base.svg
            headSprite.visible = true
            container.addChild(headSprite)
        } else {
            const head = new PIXI.Graphics()
            head.beginFill(0xffcba0)
            head.lineStyle(2, 0x8a5a44, 1)
            head.drawCircle(0, -10, 100)
            head.endFill()
            // 系統幾何頭永遠隱藏（等待 Avatar-Base.svg 載入顯示）
            head.visible = false
            container.addChild(head)
        }

        // 眉毛：300x300 全畫布貼圖，與 Avatar-Base.svg 對位
        const eyebrows = new PIXI.Sprite()
        eyebrows.anchor.set(0.5)
        const eyebrowsTex = svgLoader.getTexture('eye-brow')
        if (eyebrowsTex) eyebrows.texture = eyebrowsTex
        eyebrows.visible = Boolean(eyebrowsTex)
        eyebrows.x = 0
        eyebrows.y = 0
        eyebrows.width = 300
        eyebrows.height = 300
        container.addChild(eyebrows)

        // 眼睛改為「單一 300x300 全畫布」的貼圖，與 Avatar-Base.svg 對位
        const eyesSprite = new PIXI.Sprite()
        eyesSprite.anchor.set(0.5)
        const eyesTex = svgLoader.getTexture('normal')
        if (eyesTex) eyesSprite.texture = eyesTex
        eyesSprite.visible = Boolean(eyesTex)
        eyesSprite.x = 0
        eyesSprite.y = 0
        eyesSprite.width = 300
        eyesSprite.height = 300
        container.addChild(eyesSprite)

        // 嘴巴改為與 Base 同畫布的 300x300 貼圖
        const mouth = new PIXI.Sprite()
        mouth.anchor.set(0.5)
        const mTex = svgLoader.getTexture('soft-smile') || svgLoader.getTexture('X')
        if (mTex) mouth.texture = mTex
        mouth.visible = Boolean(mTex)
        mouth.x = 0
        mouth.y = 0
        mouth.width = 300
        mouth.height = 300
        container.addChild(mouth)

        // 儲存參考以便後續動畫
        container.mouth = mouth
        container.eyes = [eyesSprite]
        container.eyebrows = eyebrows
        // 根據實際載入的紋理設置初始狀態
        container.currentMouthShape = mTex === svgLoader.getTexture('soft-smile') ? 'soft-smile' : 'X'
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

    // 更新嘴型紋理 - 添加備援機制
    const updateMouthTexture = (mouth: PIXI.Sprite, shape: string) => {
        let texture = svgLoader.getTexture(shape)

        // 如果特定嘴型載入失敗，使用備援嘴型（靜默處理，不顯示警告）
        if (!texture) {
            // 根據嘴型類型選擇最接近的備援
            if (['A', 'E', 'O', 'big-smile'].includes(shape)) {
                // 說話嘴型使用 soft-smile 作為備援
                texture = svgLoader.getTexture('soft-smile')
            } else if (['X', 'tight'].includes(shape)) {
                // 閉嘴類型使用 soft-smile 作為備援
                texture = svgLoader.getTexture('soft-smile')
            } else {
                // 其他類型使用 soft-smile 作為備援
                texture = svgLoader.getTexture('soft-smile')
            }

            // 如果備援也失敗，使用預設
            if (!texture) {
                texture = svgLoader.getTexture('soft-smile')
            }
        }

        if (texture) {
            mouth.texture = texture
            // 步驟 4：只在說話動畫中檢查並修正縮放為 0.3（測試是否為正常大小）
            if (avatarRef.current?.isTalking && (mouth.scale.x !== 0.3 || mouth.scale.y !== 0.3)) {
                console.log(`🔧 說話動畫中紋理切換後修正縮放: ${mouth.scale.x} → 0.3（測試正常大小）`)
                mouth.scale.set(0.3, 0.3)
            }
        } else {
            // 靜默處理，不顯示警告
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
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        let gazeTimer = 0
        let mouthTimer = 0
        let gazeDelay = 2.0 + Math.random() * 3.0  // 2-5 秒
        let mouthDelay = 3.0 + Math.random() * 2.0  // 3-5 秒

        const animate = () => {
            gazeTimer += 1 / 60  // 假設 60fps
            mouthTimer += 1 / 60

            // 眨眼動畫 - 已註解，保持固定大小
            // const breathScale = 1 + Math.sin(time * 0.5) * 0.02
            // avatarRef.current!.scale.set(breathScale)
            // 固定縮放比例為 1.0，避免縮放感（但不影響嘴型縮放）
            // avatarRef.current!.scale.set(1.0)  // 註解掉，避免干擾嘴型縮放

            // 眨眼動畫
            if (Math.random() < 0.008) { // 降低眨眼頻率，更自然
                blink()
            }

            // 每 2~5 秒隨機換一次視線方向
            if (gazeTimer > gazeDelay) {
                gazeTimer = 0
                gazeDelay = 2.0 + Math.random() * 3.0  // 重新計算下次延遲
                const eyes = avatarRef.current!.eyes
                if (eyes && eyes.length > 0) {
                    // 閒置時：包含視線變化
                    const eyeStates = ['normal', 'look-left', 'look-right']
                    const nextEyeState = eyeStates[Math.floor(Math.random() * eyeStates.length)]
                    updateEyeTexture(eyes[0], nextEyeState)
                    avatarRef.current!.currentEyeState = nextEyeState
                    setCurrentEyeState(nextEyeState)
                }
            }

            // 每 3~5 秒隨機換一次嘴型（自然表情變化）
            if (mouthTimer > mouthDelay) {
                mouthTimer = 0
                mouthDelay = 3.0 + Math.random() * 2.0 // 重新計算下次延遲
                const mouth = avatarRef.current!.mouth
                if (mouth) {
                    // 閒置時的嘴型選項：僅使用自然表情
                    const idleMouthStates = ['X', 'tight', 'soft-smile']
                    const nextMouth = idleMouthStates[Math.floor(Math.random() * idleMouthStates.length)]
                    updateMouthTexture(mouth, nextMouth)
                    avatarRef.current!.currentMouthShape = nextMouth
                    setCurrentMouthShape(nextMouth)
                }
            }

            // 每幀校正位置（以幾何中心精準對齊）
            const app = appRef.current
            const avatar = avatarRef.current
            if (app && avatar) {
                centerAvatarByPivot(app, avatar)
                // 確保動畫過程中維持 300x300 比例（但不影響嘴型縮放）
                // avatar.scale.set(1.0)  // 註解掉，避免干擾嘴型縮放
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
    }

    const blink = () => {
        if (!avatarRef.current?.eyes) return

        const eyes = avatarRef.current.eyes as PIXI.Sprite[]
        const eye = eyes[0]
        updateEyeTexture(eye, 'blink')
        setTimeout(() => {
            updateEyeTexture(eye, 'normal')
        }, 120)
    }

    const startTalkingAnimation = (script: AnimationScript, audioUrl: string) => {
        if (!avatarRef.current) return

        // 設置說話動畫標識
        avatarRef.current.isTalking = true

        // 停止閒置動畫
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        // 清理之前的音訊
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
        }

        console.log('開始動畫，時長:', script.duration, '音訊URL:', audioUrl)

        // 播放音訊（若提供）
        if (audioUrl) {
            const audio = new Audio()
                // 允許跨來源播放，避免某些瀏覽器的限制
                ; (audio as any).crossOrigin = 'anonymous'
                ; (audio as any).playsInline = true

            // 先載入音訊，再播放
            audio.addEventListener('canplaythrough', () => {
                console.log('音訊可播放，開始播放')
                audio.play().catch((err) => {
                    console.warn('音訊播放被阻擋或失敗，將僅顯示嘴型動畫。', err)
                    // 即使音訊播放失敗，仍然繼續動畫
                })
            })

            audio.addEventListener('error', (e) => {
                console.warn('音訊資源載入失敗：', audio.error, e)
                // 音訊載入失敗時，仍然繼續動畫
            })

            audio.addEventListener('ended', () => {
                console.log('音訊播放結束')
            })

            audio.src = audioUrl
            audioRef.current = audio
        }

        // 開始說話動畫
        let startTime = Date.now()
        const animate = () => {
            // 使用音頻時間進行更精確的同步
            const currentTime = audioRef.current?.currentTime || (Date.now() - startTime) / 1000

            // 更新嘴型
            updateMouthShape(script.mouth_shapes, currentTime)

            // 更新頭部動作
            updateHeadMovement(script.head_movements, currentTime)

            // 說話時的眼睛控制：只使用 normal 和 blink
            if (avatarRef.current?.eyes && avatarRef.current.eyes.length > 0) {
                const eye = avatarRef.current.eyes[0] as PIXI.Sprite
                // 每 2-4 秒隨機眨眼，保持眼睛生動
                if (Math.random() < 0.01) { // 約 1% 機率眨眼
                    updateEyeTexture(eye, 'blink')
                    setTimeout(() => {
                        updateEyeTexture(eye, 'normal')
                    }, 120)
                }
            }

            // 根據音訊和動畫時長決定何時結束
            const shouldContinue = currentTime < script.duration ||
                (audioRef.current && !audioRef.current.ended && !audioRef.current.paused)

            if (shouldContinue) {
                // 提高動畫頻率：使用 setTimeout 控制更高頻率
                setTimeout(() => {
                    animationRef.current = requestAnimationFrame(animate)
                }, 4) // 約 240fps（從 120fps 提升）
            } else {
                console.log('動畫結束，當前時間:', currentTime, '動畫時長:', script.duration)
                // 動畫結束，回到閒置狀態
                if (audioRef.current && !audioRef.current.ended) {
                    console.log('停止音訊播放')
                    audioRef.current.pause()
                }

                // 重置說話動畫標識
                if (avatarRef.current) {
                    avatarRef.current.isTalking = false
                }

                // 重置嘴型到自然狀態（0.3），但不強制為 'X'，讓閒置動畫的隨機切換生效
                if (avatarRef.current?.mouth) {
                    const mouth = avatarRef.current.mouth as PIXI.Sprite
                    // 平滑過渡到自然狀態（0.3），但不強制指定嘴型
                    animateMouthShape(mouth, 0.3, 300)
                    // 不強制更新紋理，讓閒置動畫的隨機切換邏輯生效
                    // updateMouthTexture(mouth, 'X')
                    // avatarRef.current.currentMouthShape = 'X'
                    // setCurrentMouthShape('X')
                }

                startIdleAnimation()
            }
        }

        animate()
    }

    // 尋找下一個有效嘴型的輔助函數
    const findNextValidMouthShape = (mouthShapes: any[], currentTime: number): string | null => {
        // 根據當前狀態動態決定有效嘴型
        let validMouthShapes: string[]
        if (avatarRef.current?.isTalking) {
            // 說話時：只會接受 A, E, O, big-smile
            validMouthShapes = ['A', 'E', 'O', 'big-smile']
        } else {
            // 閒置時：只會接受 X, tight, soft-smile
            validMouthShapes = ['X', 'tight', 'soft-smile']
        }

        // 從當前時間開始，尋找下一個有效嘴型
        for (let i = 0; i < mouthShapes.length; i++) {
            const shape = mouthShapes[i]
            if (shape.start > currentTime && validMouthShapes.includes(shape.shape)) {
                return shape.shape
            }
        }
        return null
    }

    const updateMouthShape = (mouthShapes: any[], currentTime: number) => {
        if (!avatarRef.current?.mouth) return

        const mouth = avatarRef.current.mouth as PIXI.Sprite
        const currentShape = mouthShapes.find(shape =>
            currentTime >= shape.start && currentTime <= shape.end
        )

        if (currentShape && currentShape.shape !== avatarRef.current.currentMouthShape) {
            const newShape = currentShape.shape

            // 過濾邏輯：根據當前狀態動態決定有效嘴型
            let validMouthShapes: string[]
            if (avatarRef.current?.isTalking) {
                // 說話時：只會接受 A, E, O, big-smile
                validMouthShapes = ['A', 'E', 'O', 'big-smile']
            } else {
                // 閒置時：只會接受 X, tight, soft-smile
                validMouthShapes = ['X', 'tight', 'soft-smile']
            }

            if (!validMouthShapes.includes(newShape)) {
                // 智能跳過：尋找下一個有效嘴型
                const nextValidShape = findNextValidMouthShape(mouthShapes, currentTime)
                if (nextValidShape) {
                    console.log(`🚀 跳轉到下一個有效嘴型: ${nextValidShape}`)
                    // 立即切換到下一個有效嘴型
                    const oldShape = avatarRef.current.currentMouthShape
                    avatarRef.current.currentMouthShape = nextValidShape
                    setCurrentMouthShape(nextValidShape)

                    // 更新嘴型紋理
                    updateMouthTexture(mouth, nextValidShape)

                    // 計算目標縮放值
                    const targetScale = getMouthScale(nextValidShape)

                    // 記錄跳轉後的嘴型切換
                    console.log(`🔄 嘴型跳轉: ${oldShape} → ${nextValidShape}`)
                    console.log(`📏 縮放變化: 重置為 0.3 → 目標 ${targetScale}`)

                    // 執行平滑的嘴型切換動畫
                    animateMouthShape(mouth, targetScale, 30) // 跳轉時使用更快的動畫
                }
                return // 處理完跳轉後返回
            }

            // 步驟 1：只在說話動畫中強制重置縮放為 0.3（測試是否為正常大小）
            if (avatarRef.current.isTalking) {
                mouth.scale.set(0.3, 0.3)
                console.log(`🔧 說話動畫中強制重置縮放為 0.3（測試正常大小）`)
            }

            // 更新嘴型狀態
            const oldShape = avatarRef.current.currentMouthShape
            avatarRef.current.currentMouthShape = newShape
            setCurrentMouthShape(newShape)

            // 更新嘴型紋理（說話過程中不檢查資源存在性）
            updateMouthTexture(mouth, newShape)

            // 計算目標縮放值
            const targetScale = getMouthScale(newShape)

            // 步驟 2：追蹤縮放值變化
            console.log(`🔄 嘴型切換: ${oldShape} → ${newShape}`)
            console.log(`📏 縮放變化: 重置為 0.3 → 目標 ${targetScale}`)

            // 檢查嘴型是否在指定範圍內
            const isIdleMouth = ['X', 'tight', 'soft-smile'].includes(newShape)
            const isTalkingMouth = ['A', 'E', 'O', 'big-smile'].includes(newShape)

            if (isIdleMouth) {
                console.log(`🏠 閒置嘴型: ${newShape}`)
            } else if (isTalkingMouth) {
                console.log(`🗣️ 說話嘴型: ${newShape}`)
            }
            // 移除警告信息，因為過濾邏輯已經處理了無效嘴型

            // 根據嘴型變化程度調整動畫時長
            let animationDuration = 30  // 從 50ms 進一步減少到 30ms，提高同步性
            if (oldShape && newShape) {
                const oldScale = getMouthScale(oldShape)
                const scaleDiff = Math.abs(targetScale - oldScale)
                // 縮放差異越大，動畫時長越短（更快速）
                animationDuration = Math.max(20, 60 - scaleDiff * 100)  // 最小 20ms，最大 60ms
            }

            // 執行平滑的嘴型切換動畫
            animateMouthShape(mouth, targetScale, animationDuration)

            // 測試階段：暫時移除震動效果，排除震動導致的縮放問題
            // if (['A', 'G', 'H'].includes(newShape)) {
            //     setTimeout(() => {
            //         animateMouthVibration(mouth, 0.08, 150)
            //     }, 100)
            // }

            // 測試階段：暫時移除閉嘴狀態的特殊處理，統一使用 1.0 縮放
            // if (newShape === 'X') {
            //     // 閉嘴時稍微縮小，更自然
            //     setTimeout(() => {
            //         mouth.scale.set(0.95, 0.95)
            //     }, 50)
            // }
        }
    }

    // 獲取嘴型縮放值 - 測試階段：全部設為 0.3（測試是否為正常大小）
    const getMouthScale = (shape: string): number => {
        // 使用 if-else 邏輯分離閒置和說話的嘴型配置
        if (['X', 'tight', 'soft-smile'].includes(shape)) {
            // 閒置時的嘴型：自然表情，統一縮放
            return 0.3
        } else if (['A', 'E', 'O', 'big-smile'].includes(shape)) {
            // 說話時的嘴型：Rhubarb 標準名稱（根據實際可用檔案），統一縮放
            return 0.3
        } else {
            // 其他嘴型：預設縮放（理論上不會執行到這裡，因為已經過濾了）
            return 0.3
        }
    }

    const updateHeadMovement = (headMovements: any[], currentTime: number) => {
        if (!avatarRef.current) return

        const currentMovement = headMovements.find(movement =>
            currentTime >= movement.start && currentTime <= movement.end
        )

        if (currentMovement) {
            // 執行頭部動作
            const avatar = avatarRef.current
            const intensity = currentMovement.intensity || 0.1

            if (currentMovement.type === 'nod') {
                // 點頭動作
                const nodOffset = Math.sin(currentTime * 10) * intensity * 10
                avatar.y = 150 + nodOffset
            }
        }
    }

    // 平滑嘴型切換動畫
    const animateMouthShape = (mouth: PIXI.Sprite, targetScale: number, duration: number) => {
        const startScale = mouth.scale.x
        const scaleDiff = targetScale - startScale
        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // 使用 easeOutQuad 緩動函數
            const easeProgress = 1 - (1 - progress) * (1 - progress)
            const currentScale = startScale + scaleDiff * easeProgress

            mouth.scale.set(currentScale, currentScale)

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                // 步驟 3：只在說話動畫中強制恢復縮放為 0.3（測試是否為正常大小）
                if (avatarRef.current?.isTalking) {
                    mouth.scale.set(0.3, 0.3)
                    console.log(`✅ 說話動畫完成: 最終縮放強制恢復為 0.3（測試正常大小）`)
                }
            }
        }

        animate()
    }

    // 嘴型震動效果
    const animateMouthVibration = (mouth: PIXI.Sprite, intensity: number, duration: number) => {
        const startTime = Date.now()
        const originalScale = mouth.scale.x

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = elapsed / duration

            if (progress < 1) {
                const vibration = Math.sin(elapsed * 0.02) * intensity
                const currentScale = originalScale + vibration
                mouth.scale.set(currentScale, currentScale)
                requestAnimationFrame(animate)
            } else {
                // 恢復原始縮放
                mouth.scale.set(originalScale, originalScale)
            }
        }

        animate()
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
