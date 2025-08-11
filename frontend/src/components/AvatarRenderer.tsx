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

        // 優化後的眼睛系統
        const leftEye = new PIXI.Sprite()
        leftEye.x = -35
        leftEye.y = -30
        leftEye.width = 28
        leftEye.height = 28
        leftEye.anchor.set(0.5)
        leftEye.tint = 0x333333
        container.addChild(leftEye)

        const rightEye = new PIXI.Sprite()
        rightEye.x = 35
        rightEye.y = -30
        rightEye.width = 28
        rightEye.height = 28
        rightEye.anchor.set(0.5)
        rightEye.tint = 0x333333
        container.addChild(rightEye)

        // 優化後的嘴巴系統
        const mouth = new PIXI.Sprite()
        mouth.x = 0
        mouth.y = 20
        mouth.width = 60
        mouth.height = 40
        mouth.anchor.set(0.5)
        mouth.tint = 0x7a3b2e
        container.addChild(mouth)

        // 設置初始紋理
        updateMouthTexture(mouth, 'X')
        updateEyeTexture(leftEye, 'normal')
        updateEyeTexture(rightEye, 'normal')

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
            const audio = new Audio(audioUrl)
            audioRef.current = audio
            audio.play()
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
