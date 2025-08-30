/**
 * メッセージ表示コンポーネント
 * バトル中のシステムメッセージを表示する
 */
class MessageDisplay extends HTMLElement {
    constructor() {
        super();
        this.currentMessage = '';
        this.messageQueue = [];
        this.isDisplaying = false;
        this.textSpeed = 30; // ミリ秒間隔でテキスト表示
        this.currentTypewriterInterval = null;
        this.onStateChangeCallback = null; // UI状態変更コールバック
        this.setupComponent();
        this.initializeWithDefaultMessage();
    }

    /**
     * コンポーネントの初期設定
     */
    setupComponent() {
        this.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 80px;
                    background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
                    border-top: 3px solid #FFD700;
                    border-bottom: 2px solid #666;
                    position: relative;
                    overflow: hidden;
                }

                .message-container {
                    width: 90%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    position: relative;
                    margin-top : 1em;
                    border : 5px solid #FFF;
                    border-radius : 10px;
                }

                .message-content {
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    font-family: 'MS UI Gothic', 'Hiragino Kaku Gothic Pro', sans-serif;
                    line-height: 1.4;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                    flex: 1;
                    word-wrap: break-word;
                }

                .message-cursor {
                    display: inline-block;
                    width: 2px;
                    height: 20px;
                    background: #FFD700;
                    margin-left: 5px;
                    animation: blink 1s infinite;
                    vertical-align: text-bottom;
                }

                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }

                .message-border {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    border: 2px solid rgba(255, 215, 0, 0.3);
                    border-radius: 4px;
                    pointer-events: none;
                }

                .message-background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: 
                        radial-gradient(circle at 10% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 90% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%);
                    pointer-events: none;
                }

                .continue-indicator {
                    position: absolute;
                    bottom: 8px;
                    right: 20px;
                    color: #FFD700;
                    font-size: 12px;
                    animation: pulse 1.5s infinite;
                    display: none;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }

                .continue-indicator.show {
                    display: block;
                }
            </style>
            
            <div class="message-background"></div>
            <div class="message-container">
                <div class="message-content" id="message-content"></div>
            </div>
            <div class="message-border"></div>
            <div class="continue-indicator" id="continue-indicator">▼</div>
        `;

        // クリックで次のメッセージへ
        this.addEventListener('click', async () => {
            if (this.isDisplaying) {
                this.skipCurrentMessage();
            } else {
                await this.showNextMessage();
            }
        });

        // スペースキーでも次のメッセージへ
        document.addEventListener('keydown', async (event) => {
            if (event.code === 'Space' || event.code === 'Enter') {
                event.preventDefault();
                if (this.isDisplaying) {
                    this.skipCurrentMessage();
                } else {
                    await this.showNextMessage();
                }
            }
        });
    }

    /**
     * デフォルトメッセージで初期化
     */
    async initializeWithDefaultMessage() {
        // システムメッセージの定数定義
        const SYSTEM_MESSAGES = {
            // BATTLE_START: 'battletest ver 20250826.2254'
            BATTLE_START: 'test'
        };
        
        await this.showMessage(SYSTEM_MESSAGES.BATTLE_START);
    }

    /**
     * メッセージを表示する
     * @param {string} message - 表示するメッセージ
     * @param {boolean} immediate - 即座に表示するかどうか
     * @returns {Promise} - 表示完了を示すPromise
     */
    async showMessage(message, immediate = false) {
        // メッセージが未定義または空の場合の処理
        if (!message || typeof message !== 'string') {
            console.error('message-display.js: 無効なメッセージが渡されました:', {
                message: message,
                type: typeof message,
                immediate: immediate
            });
            message = '';
        }
        
        if (immediate) {
            this.displayMessageImmediate(message);
            return Promise.resolve();
        } else {
            return this.displayMessageWithTypewriter(message);
        }
    }

    /**
     * タイプライター効果でメッセージを表示
     * @param {string} message - 表示するメッセージ
     * @returns {Promise} - 表示完了を示すPromise
     */
    displayMessageWithTypewriter(message) {
        return new Promise((resolve) => {
            // メッセージの安全性チェック
            if (!message || typeof message !== 'string') {
                console.error('message-display.js: displayMessageWithTypewriterに無効なメッセージが渡されました:', {
                    message: message,
                    type: typeof message
                });
                message = '';
            }
            
            const messageElement = this.querySelector('#message-content');
            const continueIndicator = this.querySelector('#continue-indicator');
            
            this.currentMessage = message;
            this.isDisplaying = true;
            continueIndicator.classList.remove('show');
            
            let currentIndex = 0;
            messageElement.innerHTML = '';
            
            const typewriterInterval = setInterval(() => {
                if (currentIndex < message.length) {
                    messageElement.textContent += message.charAt(currentIndex);
                    currentIndex++;
                } else {
                    clearInterval(typewriterInterval);
                    this.isDisplaying = false;
                    this.currentTypewriterInterval = null;
                    continueIndicator.classList.add('show');
                    // UI状態変更を通知
                    this.notifyStateChange();
                    resolve(); // タイプライター完了を通知
                }
            }, this.textSpeed);
            
            // 現在のインターバルを保存（スキップ用）
            this.currentTypewriterInterval = typewriterInterval;
            
            // スキップ時のPromise解決処理を保存
            this.currentTypewriterResolve = resolve;
        });
    }

    /**
     * メッセージを即座に表示
     * @param {string} message - 表示するメッセージ
     */
    displayMessageImmediate(message) {
        // メッセージの安全性チェック
        if (!message || typeof message !== 'string') {
            console.error('message-display.js: displayMessageImmediateに無効なメッセージが渡されました:', {
                message: message,
                type: typeof message
            });
            message = '';
        }
        
        const messageElement = this.querySelector('#message-content');
        const continueIndicator = this.querySelector('#continue-indicator');
        
        this.currentMessage = message;
        this.isDisplaying = false;
        messageElement.textContent = message;
        continueIndicator.classList.add('show');
    }

    /**
     * 現在のメッセージ表示をスキップ
     */
    skipCurrentMessage() {
        if (this.currentTypewriterInterval) {
            clearInterval(this.currentTypewriterInterval);
            this.currentTypewriterInterval = null;
        }
        
        this.displayMessageImmediate(this.currentMessage);
        
        // UI状態変更を通知
        this.notifyStateChange();
        
        // スキップ時もPromiseを解決
        if (this.currentTypewriterResolve) {
            this.currentTypewriterResolve();
            this.currentTypewriterResolve = null;
        }
    }

    /**
     * メッセージキューに追加
     * @param {string} message - 追加するメッセージ
     * @returns {Promise} - メッセージ表示完了を示すPromise
     */
    async addMessage(message) {
        this.messageQueue.push(message);
        
        // 現在表示中でなく、このメッセージが最初のものなら即座に処理開始
        if (!this.isDisplaying && this.messageQueue.length === 1) {
            await this.processMessageQueue();
        }
    }

    /**
     * メッセージキューを処理する
     */
    async processMessageQueue() {
        while (this.messageQueue.length > 0 && !this.isDisplaying) {
            const nextMessage = this.messageQueue.shift();
            await this.showMessage(nextMessage);
        }
    }

    /**
     * 次のメッセージを表示（手動操作用）
     */
    async showNextMessage() {
        if (this.messageQueue.length > 0) {
            const nextMessage = this.messageQueue.shift();
            await this.showMessage(nextMessage);
        }
    }

    /**
     * メッセージキューをクリア
     */
    clearMessages() {
        this.messageQueue = [];
        if (this.currentTypewriterInterval) {
            clearInterval(this.currentTypewriterInterval);
            this.currentTypewriterInterval = null;
        }
        if (this.currentTypewriterResolve) {
            this.currentTypewriterResolve();
            this.currentTypewriterResolve = null;
        }
        this.isDisplaying = false;
    }


    /**
     * テキスト速度を設定
     * @param {number} speed - 速度（ミリ秒）
     */
    setTextSpeed(speed) {
        this.textSpeed = Math.max(10, Math.min(200, speed));
    }

    /**
     * 現在メッセージ表示中かどうかを取得
     * @returns {boolean} メッセージ表示中の場合true
     */
    getIsDisplaying() {
        return this.isDisplaying;
    }

    /**
     * メッセージキューが空かどうかを取得
     * @returns {boolean} メッセージキューが空の場合true
     */
    getIsQueueEmpty() {
        return this.messageQueue.length === 0;
    }

    /**
     * UI操作が可能な状態かどうかを取得
     * @returns {boolean} UI操作可能な場合true
     */
    isUIInteractionAllowed() {
        return !this.isDisplaying && this.messageQueue.length === 0;
    }

    /**
     * UI状態変更コールバックを設定
     * @param {Function} callback - 状態変更時に呼ばれるコールバック
     */
    setOnStateChangeCallback(callback) {
        this.onStateChangeCallback = callback;
    }

    /**
     * UI状態変更を通知
     */
    notifyStateChange() {
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback();
        }
    }
}

// カスタム要素として登録
customElements.define('message-display', MessageDisplay);