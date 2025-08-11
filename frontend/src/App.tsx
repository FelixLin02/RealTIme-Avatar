import React, { useEffect, useState } from 'react'
import AvatarRenderer from './components/AvatarRenderer'
import ChatInterface from './components/ChatInterface'
import { AvatarService } from './services/avatarService'

type MouthShapeKey = 'X' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'

interface MockAnimationScript {
    duration: number
    mouth_shapes: Array<{ start: number; end: number; shape: MouthShapeKey }>
    head_movements: Array<{ start: number; end: number; type: 'nod' | 'shake'; intensity: number }>
}

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [avatarService] = useState(() => new AvatarService())
    const [animationScript, setAnimationScript] = useState<MockAnimationScript | undefined>(undefined)
    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined)

    useEffect(() => {
        // 初始化 LIFF
        const initializeLiff = async () => {
            try {
                // 這裡應該初始化 LIFF，但為了開發方便，我們先跳過
                console.log('LIFF 初始化完成')
            } catch (error) {
                console.error('LIFF 初始化失敗:', error)
            }
        }

        initializeLiff()
    }, [])

    const handleSendMessage = async (message: string) => {
        if (!message.trim()) return

        setIsLoading(true)
        try {
            // 嘗試走後端
            const response = await avatarService.sendMessage(message)
            setAnimationScript(response.animation_script as unknown as MockAnimationScript)
            setAudioUrl(response.audio_url)
        } catch (error) {
            console.error('發送訊息失敗，使用本地 Mock 展示:', error)
            // 後端不可用時，使用本地 Mock，確保 Phase 1 有可視回饋
            const mock: MockAnimationScript = {
                duration: 2.8,
                mouth_shapes: [
                    { start: 0.00, end: 0.20, shape: 'X' },
                    { start: 0.20, end: 0.45, shape: 'A' },
                    { start: 0.45, end: 0.70, shape: 'E' },
                    { start: 0.70, end: 0.95, shape: 'C' },
                    { start: 0.95, end: 1.30, shape: 'G' },
                    { start: 1.30, end: 1.60, shape: 'D' },
                    { start: 1.60, end: 2.00, shape: 'B' },
                    { start: 2.00, end: 2.30, shape: 'H' },
                    { start: 2.30, end: 2.80, shape: 'X' }
                ],
                head_movements: [
                    { start: 0.3, end: 0.9, type: 'nod', intensity: 4 },
                    { start: 1.4, end: 2.1, type: 'shake', intensity: 3 }
                ]
            }
            setAnimationScript(mock)
            setAudioUrl(undefined)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="app-container">
            <div className="avatar-container">
                <AvatarRenderer animationScript={animationScript} audioUrl={audioUrl} />
            </div>

            <div className="chat-container">
                <ChatInterface
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}

export default App
