import React, { useState, useRef, useEffect } from 'react'

interface ChatInterfaceProps {
    onSendMessage: (message: string) => void
    isLoading: boolean
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSendMessage, isLoading }) => {
    const [message, setMessage] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (message.trim() && !isLoading) {
            onSendMessage(message.trim())
            setMessage('')
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    // 自動聚焦到輸入框
    useEffect(() => {
        if (inputRef.current && !isLoading) {
            inputRef.current.focus()
        }
    }, [isLoading])

    return (
        <div className="chat-container">
            <div className="status-indicator" id="statusIndicator">
                {isLoading ? (
                    <>
                        <div className="loading"></div>
                        虛擬人正在回應...
                    </>
                ) : (
                    '準備就緒，請輸入訊息...'
                )}
            </div>

            <div className="typing-indicator" id="typingIndicator" style={{ display: isLoading ? 'flex' : 'none' }}>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <span>虛擬人正在思考...</span>
            </div>

            <form onSubmit={handleSubmit} className="input-group">
                <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="message-input"
                    placeholder="輸入您的訊息..."
                    maxLength={100}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="send-button"
                    disabled={isLoading || !message.trim()}
                >
                    {isLoading ? '發送中...' : '發送'}
                </button>
            </form>
        </div>
    )
}

export default ChatInterface
