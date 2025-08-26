/**
 * JRPGバトルシーンコンポーネント
 * ドラゴンクエスト風のバトル画面を提供する
 */
class BattleScene extends HTMLElement {
    constructor() {
        super();
        this.actors = {};
        this.playerParty = [];
        this.enemyParty = [];
        this.init();
    }

    /**
     * 初期化処理
     * MasterDataからアクターデータを読み込み、バトル画面を構築する
     */
    async init() {
        await this.loadActors();
        this.setupBattleField();
        this.render();
    }

    /**
     * アクターデータを読み込む
     */
    async loadActors() {
        try {
            const response = await fetch('./MasterData/actors.json');
            this.actors = await response.json();
            this.setupParties();
        } catch (error) {
            console.error('アクターデータの読み込みに失敗しました:', error);
        }
    }

    /**
     * パーティを設定する
     * プレイヤーパーティと敵パーティを分ける
     */
    setupParties() {
        this.playerParty = [];
        this.enemyParty = [];
        
        Object.entries(this.actors).forEach(([id, actor]) => {
            const actorWithId = { id, ...actor };
            if (actor.is_enemy === "FALSE") {
                this.playerParty.push(actorWithId);
            } else {
                this.enemyParty.push(actorWithId);
            }
        });
    }

    /**
     * バトルフィールドの設定
     */
    setupBattleField() {
        this.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100vw;
                    height: 100vh;
                    background: linear-gradient(180deg, #2B4C8C 0%, #1A2F5C 50%, #0F1929 100%);
                    position: relative;
                    font-family: 'MS UI Gothic', 'Hiragino Kaku Gothic Pro', sans-serif;
                }

                .battle-field {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .enemy-area {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 50px;
                }

                .enemy-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 30px;
                    justify-content: center;
                }

                .enemy {
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid #FFD700;
                    border-radius: 10px;
                    padding: 20px;
                    color: white;
                    text-align: center;
                    min-width: 120px;
                    backdrop-filter: blur(5px);
                }

                .enemy-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }

                .enemy-hp {
                    font-size: 14px;
                    color: #90EE90;
                }

                .ui-area {
                    height: 200px;
                    background: linear-gradient(180deg, #1a1a1a 0%, #333333 100%);
                    border-top: 3px solid #FFD700;
                    display: flex;
                    position: relative;
                }

                .party-status {
                    flex: 2;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .party-member {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 8px 15px;
                    border-radius: 5px;
                    color: white;
                    border-left: 4px solid #4CAF50;
                }

                .member-name {
                    font-weight: bold;
                    min-width: 80px;
                }

                .member-stats {
                    display: flex;
                    gap: 20px;
                    font-size: 14px;
                }

                .stat {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .hp-bar, .mp-bar {
                    width: 60px;
                    height: 8px;
                    background: rgba(0,0,0,0.5);
                    border-radius: 4px;
                    overflow: hidden;
                    border: 1px solid #666;
                }

                .hp-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #FF6B6B, #4CAF50);
                    transition: width 0.3s ease;
                }

                .mp-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3498DB, #2196F3);
                    transition: width 0.3s ease;
                }

                .command-area {
                    flex: 1;
                    padding: 20px;
                    background: rgba(0,0,0,0.3);
                    border-left: 2px solid #444;
                }

                .command-menu {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    height: 100%;
                }

                .command-button {
                    background: linear-gradient(145deg, #4a4a4a, #2a2a2a);
                    border: 2px solid #666;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .command-button:hover {
                    background: linear-gradient(145deg, #5a5a5a, #3a3a3a);
                    border-color: #FFD700;
                    transform: translateY(-2px);
                }

                .command-button:active {
                    transform: translateY(0);
                }

                @keyframes damage {
                    0% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                    100% { transform: translateX(0); }
                }

                .damage-animation {
                    animation: damage 0.5s ease-in-out;
                }
            </style>
            
            <div class="battle-field">
                <div class="enemy-area">
                    <div class="enemy-container" id="enemy-container">
                        <!-- 敵キャラクターがここに表示される -->
                    </div>
                </div>
                
                <div class="ui-area">
                    <div class="party-status" id="party-status">
                        <!-- パーティメンバーのステータスがここに表示される -->
                    </div>
                    
                    <div class="command-area">
                        <div class="command-menu">
                            <button class="command-button" onclick="this.getRootNode().host.handleCommand('attack')">こうげき</button>
                            <button class="command-button" onclick="this.getRootNode().host.handleCommand('magic')">じゅもん</button>
                            <button class="command-button" onclick="this.getRootNode().host.handleCommand('item')">どうぐ</button>
                            <button class="command-button" onclick="this.getRootNode().host.handleCommand('escape')">にげる</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 画面を描画する
     */
    render() {
        this.renderEnemies();
        this.renderPartyStatus();
    }

    /**
     * 敵キャラクターを描画する
     */
    renderEnemies() {
        const container = this.querySelector('#enemy-container');
        container.innerHTML = '';
        
        this.enemyParty.forEach(enemy => {
            const enemyElement = document.createElement('div');
            enemyElement.className = 'enemy';
            enemyElement.innerHTML = `
                <div class="enemy-name">${enemy.name}</div>
                <div class="enemy-hp">HP: ${enemy.hp}</div>
            `;
            container.appendChild(enemyElement);
        });
    }

    /**
     * パーティステータスを描画する
     */
    renderPartyStatus() {
        const container = this.querySelector('#party-status');
        container.innerHTML = '';
        
        this.playerParty.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'party-member';
            
            const hpPercentage = Math.floor((parseInt(member.hp) / parseInt(member.hp)) * 100);
            const mpPercentage = Math.floor((parseInt(member.mp) / parseInt(member.mp)) * 100);
            
            memberElement.innerHTML = `
                <div class="member-name">${member.name}</div>
                <div class="member-stats">
                    <div class="stat">
                        <span>HP</span>
                        <div class="hp-bar">
                            <div class="hp-fill" style="width: ${hpPercentage}%"></div>
                        </div>
                        <span>${member.hp}</span>
                    </div>
                    <div class="stat">
                        <span>MP</span>
                        <div class="mp-bar">
                            <div class="mp-fill" style="width: ${mpPercentage}%"></div>
                        </div>
                        <span>${member.mp}</span>
                    </div>
                </div>
            `;
            container.appendChild(memberElement);
        });
    }

    /**
     * コマンド処理
     * @param {string} command - 実行するコマンド
     */
    handleCommand(command) {
        switch(command) {
            case 'attack':
                console.log('こうげきを選択しました');
                this.performAttack();
                break;
            case 'magic':
                console.log('じゅもんを選択しました');
                break;
            case 'item':
                console.log('どうぐを選択しました');
                break;
            case 'escape':
                console.log('にげるを選択しました');
                break;
        }
    }

    /**
     * 攻撃アクションを実行する
     */
    performAttack() {
        // 簡単な攻撃演出
        const enemies = this.querySelectorAll('.enemy');
        if (enemies.length > 0) {
            const targetEnemy = enemies[0];
            targetEnemy.classList.add('damage-animation');
            
            setTimeout(() => {
                targetEnemy.classList.remove('damage-animation');
            }, 500);
        }
    }
}

// カスタム要素として登録
customElements.define('battle-scene', BattleScene);