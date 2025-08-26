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
        this.textSpeed = 50; // ミリ秒間隔でテキスト表示
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
        this.addEventListener('click', () => {
            if (this.isDisplaying) {
                this.skipCurrentMessage();
            } else {
                this.showNextMessage();
            }
        });

        // スペースキーでも次のメッセージへ
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space' || event.code === 'Enter') {
                event.preventDefault();
                if (this.isDisplaying) {
                    this.skipCurrentMessage();
                } else {
                    this.showNextMessage();
                }
            }
        });
    }

    /**
     * デフォルトメッセージで初期化
     */
    initializeWithDefaultMessage() {
        // システムメッセージの定数定義
        const SYSTEM_MESSAGES = {
            BATTLE_START: '魔物の群れが現れた！ コマンド？'
        };
        
        this.showMessage(SYSTEM_MESSAGES.BATTLE_START);
    }

    /**
     * メッセージを表示する
     * @param {string} message - 表示するメッセージ
     * @param {boolean} immediate - 即座に表示するかどうか
     */
    showMessage(message, immediate = false) {
        if (immediate) {
            this.displayMessageImmediate(message);
        } else {
            this.displayMessageWithTypewriter(message);
        }
    }

    /**
     * タイプライター効果でメッセージを表示
     * @param {string} message - 表示するメッセージ
     */
    displayMessageWithTypewriter(message) {
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
                continueIndicator.classList.add('show');
            }
        }, this.textSpeed);
        
        // 現在のインターバルを保存（スキップ用）
        this.currentTypewriterInterval = typewriterInterval;
    }

    /**
     * メッセージを即座に表示
     * @param {string} message - 表示するメッセージ
     */
    displayMessageImmediate(message) {
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
    }

    /**
     * メッセージキューに追加
     * @param {string} message - 追加するメッセージ
     */
    addMessage(message) {
        this.messageQueue.push(message);
        if (!this.isDisplaying && this.messageQueue.length === 1) {
            this.showNextMessage();
        }
    }

    /**
     * 次のメッセージを表示
     */
    showNextMessage() {
        if (this.messageQueue.length > 0) {
            const nextMessage = this.messageQueue.shift();
            this.showMessage(nextMessage);
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
    }

    /**
     * 戦闘イベントメッセージを表示
     * @param {string} eventType - イベントタイプ
     * @param {Object} params - パラメータ
     */
    showBattleEvent(eventType, params = {}) {
        let message = '';
        
        switch (eventType) {
            case 'attack':
                message = `${params.attacker}の攻撃！ ${params.target}に${params.damage}のダメージ！`;
                break;
            case 'magic':
                message = `${params.caster}は${params.spell}を唱えた！`;
                break;
            case 'item':
                message = `${params.user}は${params.item}を使った！`;
                break;
            case 'escape':
                message = 'パーティは逃げ出した！';
                break;
            case 'victory':
                message = '敵を倒した！';
                break;
            case 'defeat':
                message = 'パーティは全滅した...';
                break;
            case 'turn':
                message = `${params.character}のターン！`;
                break;
            default:
                message = params.text || 'システムメッセージ';
        }
        
        this.addMessage(message);
    }

    /**
     * テキスト速度を設定
     * @param {number} speed - 速度（ミリ秒）
     */
    setTextSpeed(speed) {
        this.textSpeed = Math.max(10, Math.min(200, speed));
    }
}

// カスタム要素として登録
customElements.define('message-display', MessageDisplay);