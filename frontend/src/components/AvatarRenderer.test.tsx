import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AvatarRenderer from './AvatarRenderer'

// Mock PIXI.js
jest.mock('pixi.js', () => ({
    Application: jest.fn().mockImplementation(() => ({
        screen: { width: 300, height: 300 },
        stage: { addChild: jest.fn() },
        destroy: jest.fn(),
        view: null
    })),
    Container: jest.fn().mockImplementation(() => ({
        x: 0,
        y: 0,
        scale: { set: jest.fn() },
        rotation: 0,
        addChild: jest.fn(),
        mouth: null,
        eyes: [],
        currentMouthShape: 'X',
        currentEyeState: 'normal'
    })),
    Graphics: jest.fn().mockImplementation(() => ({
        beginFill: jest.fn(),
        drawCircle: jest.fn(),
        drawEllipse: jest.fn(),
        endFill: jest.fn(),
        addChild: jest.fn()
    })),
    Sprite: jest.fn().mockImplementation(() => ({
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        scale: { y: 1, set: jest.fn() },
        anchor: { set: jest.fn() },
        texture: null,
        addChild: jest.fn()
    })),
    Texture: {
        from: jest.fn()
    }
}))

// Mock SVG loader
jest.mock('../services/svgLoader', () => ({
    svgLoader: {
        preloadAll: jest.fn().mockResolvedValue(undefined),
        getTexture: jest.fn().mockReturnValue(null),
        cleanup: jest.fn()
    }
}))

// Mock animation services
jest.mock('../services/animationService', () => ({
    mouthAnimationService: {
        animateMouthShape: jest.fn(),
        animateMouthVibration: jest.fn()
    },
    eyeAnimationService: {
        animateBlink: jest.fn()
    },
    headAnimationService: {
        animateNod: jest.fn(),
        animateShake: jest.fn()
    }
}))

describe('AvatarRenderer', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Mock requestAnimationFrame
        global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16) as any)
        global.cancelAnimationFrame = jest.fn()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('應該渲染載入介面', () => {
        render(<AvatarRenderer />)

        expect(screen.getByText('載入中...')).toBeInTheDocument()
        expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('應該在載入完成後顯示畫布', async () => {
        render(<AvatarRenderer />)

        await waitFor(() => {
            expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
        }, { timeout: 3000 })

        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
    })

    it('應該處理動畫腳本', async () => {
        const mockAnimationScript = {
            duration: 2,
            mouth_shapes: [
                { start: 0, end: 1, shape: 'A' },
                { start: 1, end: 2, shape: 'X' }
            ],
            head_movements: [
                { start: 0, end: 1, type: 'nod', intensity: 0.5 }
            ]
        }

        const mockAudioUrl = 'test-audio.mp3'

        render(
            <AvatarRenderer
                animationScript={mockAnimationScript}
                audioUrl={mockAudioUrl}
            />
        )

        // 等待載入完成
        await waitFor(() => {
            expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
        }, { timeout: 3000 })

        // 驗證動畫腳本被處理
        // 這裡可以添加更多具體的測試邏輯
    })

    it('應該處理載入錯誤', async () => {
        // Mock SVG loader 拋出錯誤
        const { svgLoader } = require('../services/svgLoader')
        svgLoader.preloadAll.mockRejectedValue(new Error('載入失敗'))

        render(<AvatarRenderer />)

        await waitFor(() => {
            expect(screen.getByText('載入失敗')).toBeInTheDocument()
        }, { timeout: 3000 })
    })

    it('應該在組件卸載時清理資源', () => {
        const { unmount } = render(<AvatarRenderer />)

        unmount()

        // 驗證清理函數被調用
        const { svgLoader } = require('../services/svgLoader')
        expect(svgLoader.cleanup).toHaveBeenCalled()
    })
})
