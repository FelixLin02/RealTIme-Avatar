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

            // 根據錯誤類型提供更詳細的錯誤訊息
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // 伺服器回應了錯誤狀態碼
                    const status = error.response.status
                    const data = error.response.data

                    if (status === 500) {
                        // 後端內部錯誤，通常是 TTS 服務問題
                        throw new Error('語音服務暫時無法使用，請稍後再試（錯誤代碼：500）')
                    } else if (status === 404) {
                        // API 端點不存在
                        throw new Error('服務端點不存在，請檢查網路連線（錯誤代碼：404）')
                    } else if (status === 403) {
                        // 權限不足
                        throw new Error('權限不足，請檢查 API 金鑰設定（錯誤代碼：403）')
                    } else {
                        // 其他 HTTP 錯誤
                        throw new Error(`伺服器錯誤：${data?.detail || data?.message || '未知錯誤'}（錯誤代碼：${status}）`)
                    }
                } else if (error.request) {
                    // 請求已發送但沒有收到回應
                    throw new Error('無法連接到伺服器，請檢查網路連線')
                } else {
                    // 請求設定錯誤
                    throw new Error('請求設定錯誤，請稍後再試')
                }
            } else {
                // 非 Axios 錯誤
                throw new Error('發送訊息失敗，請稍後再試')
            }
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
