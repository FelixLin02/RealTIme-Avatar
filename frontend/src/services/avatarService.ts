import axios from 'axios'

interface ChatResponse {
    audio_url: string
    animation_script: {
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
    message: string
}

export class AvatarService {
    private baseURL: string

    constructor() {
        // 開發環境使用本地後端
        this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    }

    async sendMessage(message: string): Promise<ChatResponse> {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/chat`, {
                message,
                user_id: this.getUserId()
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30秒超時
            })

            return response.data
        } catch (error) {
            console.error('API 請求失敗:', error)
            throw new Error('發送訊息失敗，請稍後再試')
        }
    }

    private getUserId(): string {
        // 從 LIFF 或 localStorage 取得使用者 ID
        // 這裡簡化處理，實際應該從 LIFF 取得
        const userId = localStorage.getItem('user_id')
        if (userId) {
            return userId
        }

        // 生成臨時使用者 ID
        const tempUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('user_id', tempUserId)
        return tempUserId
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseURL}/health`)
            return response.status === 200
        } catch (error) {
            console.error('健康檢查失敗:', error)
            return false
        }
    }
}
