import * as PIXI from 'pixi.js'

// 動畫緩動函數
export const Easing = {
    // 線性
    linear: (t: number): number => t,

    // 二次緩動
    easeInQuad: (t: number): number => t * t,
    easeOutQuad: (t: number): number => t * (2 - t),
    easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    // 三次緩動
    easeInCubic: (t: number): number => t * t * t,
    easeOutCubic: (t: number): number => (--t) * t * t + 1,
    easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    // 彈性緩動
    easeOutElastic: (t: number): number => {
        const p = 0.3
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
    },

    // 彈跳緩動
    easeOutBounce: (t: number): number => {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
        }
    }
}

// 動畫配置接口
export interface AnimationConfig {
    duration: number
    easing?: keyof typeof Easing
    onUpdate?: (progress: number) => void
    onComplete?: () => void
}

// 動畫類別
export class Animation {
    private startTime: number = 0
    private isRunning: boolean = false
    private animationFrame: number | null = null
    private config: AnimationConfig

    constructor(config: AnimationConfig) {
        this.config = config
    }

    // 開始動畫
    public start(): void {
        if (this.isRunning) return

        this.isRunning = true
        this.startTime = Date.now()
        this.animate()
    }

    // 停止動畫
    public stop(): void {
        this.isRunning = false
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame)
            this.animationFrame = null
        }
    }

    // 動畫循環
    private animate(): void {
        if (!this.isRunning) return

        const elapsed = Date.now() - this.startTime
        const progress = Math.min(elapsed / this.config.duration, 1)

        // 應用緩動函數
        const easing = this.config.easing || 'linear'
        const easedProgress = Easing[easing](progress)

        // 調用更新回調
        if (this.config.onUpdate) {
            this.config.onUpdate(easedProgress)
        }

        // 檢查是否完成
        if (progress >= 1) {
            this.isRunning = false
            if (this.config.onComplete) {
                this.config.onComplete()
            }
            return
        }

        // 繼續下一幀
        this.animationFrame = requestAnimationFrame(() => this.animate())
    }
}

// 嘴型動畫服務
export class MouthAnimationService {
    private static instance: MouthAnimationService
    private currentAnimation: Animation | null = null

    private constructor() { }

    public static getInstance(): MouthAnimationService {
        if (!MouthAnimationService.instance) {
            MouthAnimationService.instance = new MouthAnimationService()
        }
        return MouthAnimationService.instance
    }

    // 執行嘴型切換動畫
    public animateMouthShape(
        mouth: PIXI.Sprite,
        targetScale: number,
        duration: number = 150,
        onComplete?: () => void
    ): void {
        // 停止當前動畫
        if (this.currentAnimation) {
            this.currentAnimation.stop()
        }

        const startScale = mouth.scale.y
        const scaleDiff = targetScale - startScale

        this.currentAnimation = new Animation({
            duration,
            easing: 'easeOutQuad',
            onUpdate: (progress) => {
                mouth.scale.y = startScale + scaleDiff * progress
            },
            onComplete: () => {
                this.currentAnimation = null
                if (onComplete) onComplete()
            }
        })

        this.currentAnimation.start()
    }

    // 執行嘴型震動動畫（用於強調發音）
    public animateMouthVibration(
        mouth: PIXI.Sprite,
        intensity: number = 0.1,
        duration: number = 200
    ): void {
        const originalScale = mouth.scale.y

        this.currentAnimation = new Animation({
            duration,
            easing: 'easeOutElastic',
            onUpdate: (progress) => {
                const vibration = Math.sin(progress * Math.PI * 8) * intensity * (1 - progress)
                mouth.scale.y = originalScale + vibration
            },
            onComplete: () => {
                mouth.scale.y = originalScale
                this.currentAnimation = null
            }
        })

        this.currentAnimation.start()
    }
}

// 眼睛動畫服務
export class EyeAnimationService {
    private static instance: EyeAnimationService
    private currentAnimation: Animation | null = null

    private constructor() { }

    public static getInstance(): EyeAnimationService {
        if (!EyeAnimationService.instance) {
            EyeAnimationService.instance = new EyeAnimationService()
        }
        return EyeAnimationService.instance
    }

    // 執行眨眼動畫
    public animateBlink(
        eye: PIXI.Sprite,
        duration: number = 250,
        onComplete?: () => void
    ): void {
        if (this.currentAnimation) {
            this.currentAnimation.stop()
        }

        const originalScaleY = eye.scale.y

        this.currentAnimation = new Animation({
            duration,
            easing: 'easeOutBounce',
            onUpdate: (progress) => {
                if (progress < 0.4) {
                    // 閉眼階段
                    eye.scale.y = originalScaleY * (1 - progress * 2.5)
                } else {
                    // 睜眼階段
                    const openProgress = (progress - 0.4) / 0.6
                    eye.scale.y = originalScaleY * (0.1 + openProgress * 0.9)
                }
            },
            onComplete: () => {
                eye.scale.y = originalScaleY
                this.currentAnimation = null
                if (onComplete) onComplete()
            }
        })

        this.currentAnimation.start()
    }

    // 執行眼睛表情變化
    public animateEyeExpression(
        eye: PIXI.Sprite,
        targetScale: number,
        duration: number = 300,
        onComplete?: () => void
    ): void {
        if (this.currentAnimation) {
            this.currentAnimation.stop()
        }

        const startScale = eye.scale.y
        const scaleDiff = targetScale - startScale

        this.currentAnimation = new Animation({
            duration,
            easing: 'easeOutQuad',
            onUpdate: (progress) => {
                eye.scale.y = startScale + scaleDiff * progress
            },
            onComplete: () => {
                this.currentAnimation = null
                if (onComplete) onComplete()
            }
        })

        this.currentAnimation.start()
    }
}

// 頭部動作動畫服務
export class HeadAnimationService {
    private static instance: HeadAnimationService
    private currentAnimation: Animation | null = null

    private constructor() { }

    public static getInstance(): HeadAnimationService {
        if (!HeadAnimationService.instance) {
            HeadAnimationService.instance = new HeadAnimationService()
        }
        return HeadAnimationService.instance
    }

    // 執行點頭動畫
    public animateNod(
        head: PIXI.Container,
        intensity: number = 0.1,
        duration: number = 1000
    ): void {
        if (this.currentAnimation) {
            this.currentAnimation.stop()
        }

        const originalRotation = head.rotation

        this.currentAnimation = new Animation({
            duration,
            easing: 'easeInOutQuad',
            onUpdate: (progress) => {
                const nodValue = Math.sin(progress * Math.PI * 2) * intensity
                head.rotation = originalRotation + nodValue
            },
            onComplete: () => {
                head.rotation = originalRotation
                this.currentAnimation = null
            }
        })

        this.currentAnimation.start()
    }

    // 執行搖頭動畫
    public animateShake(
        head: PIXI.Container,
        intensity: number = 0.05,
        duration: number = 800
    ): void {
        if (this.currentAnimation) {
            this.currentAnimation.stop()
        }

        const originalRotation = head.rotation

        this.currentAnimation = new Animation({
            duration,
            easing: 'easeOutElastic',
            onUpdate: (progress) => {
                const shakeValue = Math.sin(progress * Math.PI * 4) * intensity * (1 - progress)
                head.rotation = originalRotation + shakeValue
            },
            onComplete: () => {
                head.rotation = originalRotation
                this.currentAnimation = null
            }
        })

        this.currentAnimation.start()
    }
}

// 導出服務實例
export const mouthAnimationService = MouthAnimationService.getInstance()
export const eyeAnimationService = EyeAnimationService.getInstance()
export const headAnimationService = HeadAnimationService.getInstance()
