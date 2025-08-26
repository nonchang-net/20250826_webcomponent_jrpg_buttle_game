/**
 * JRPGバトルシーンコンポーネント
 * ドラゴンクエスト風のバトル画面を提供する
 * 分割されたコンポーネント（enemy-display, party-status, command-menu）を統合管理する
 */
class BattleScene extends HTMLElement {
    constructor() {
        super();
        this.actors = {};
        this.playerParty = [];
        this.enemyParty = [];
        this.enemyDisplay = null;
        this.partyStatus = null;
        this.commandMenu = null;
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
                }

                .ui-area {
                    height: 200px;
                    background: linear-gradient(180deg, #1a1a1a 0%, #333333 100%);
                    border-top: 3px solid #FFD700;
                    display: flex;
                    position: relative;
                }
            </style>
            
            <div class="battle-field">
                <div class="enemy-area">
                    <enemy-display id="enemy-display"></enemy-display>
                </div>
                
                <div class="ui-area">
                    <party-status id="party-status"></party-status>
                    <command-menu id="command-menu"></command-menu>
                </div>
            </div>
        `;
        
        // 子コンポーネントの参照を取得
        this.enemyDisplay = this.querySelector('#enemy-display');
        this.partyStatus = this.querySelector('#party-status');
        this.commandMenu = this.querySelector('#command-menu');
        
        // イベントリスナーを設定
        this.setupEventListeners();
    }

    /**
     * 画面を描画する
     */
    render() {
        if (this.enemyDisplay) {
            this.enemyDisplay.setEnemies(this.enemyParty);
        }
        if (this.partyStatus) {
            this.partyStatus.setPartyMembers(this.playerParty);
        }
    }

    /**
     * イベントリスナーを設定する
     */
    setupEventListeners() {
        // コマンドメニューからのイベント
        this.addEventListener('command-selected', (event) => {
            this.handleCommand(event.detail.command);
        });
        
        // 敵選択イベント
        this.addEventListener('enemy-selected', (event) => {
            console.log('敵が選択されました:', event.detail.enemy.name);
        });
        
        // パーティメンバー選択イベント
        this.addEventListener('member-selected', (event) => {
            console.log('パーティメンバーが選択されました:', event.detail.member.name);
        });
        
        // アイテム選択イベント
        this.addEventListener('item-selected', (event) => {
            console.log('アイテムが選択されました:', event.detail.itemId);
        });
        
        // 魔法選択イベント
        this.addEventListener('magic-selected', (event) => {
            console.log('魔法が選択されました:', event.detail.spellId);
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
                this.commandMenu.showTargetSelection();
                break;
            case 'magic':
                console.log('じゅもんを選択しました');
                // サンプル魔法データ（実際はMasterDataから取得）
                const spells = [
                    { id: 'heal', name: '回復魔法(小)', mpCost: 5, availableMp: 50 },
                    { id: 'fire', name: '炎の魔法', mpCost: 8, availableMp: 50 },
                    { id: 'thunder', name: '雷の魔法', mpCost: 12, availableMp: 50 }
                ];
                this.commandMenu.showMagicMenu(spells);
                break;
            case 'item':
                console.log('どうぐを選択しました');
                // サンプルアイテムデータ（実際はMasterDataから取得）
                const items = [
                    { id: 'potion', name: '回復薬', quantity: 3 },
                    { id: 'mana', name: 'マナポーション', quantity: 1 }
                ];
                this.commandMenu.showItemMenu(items);
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
        // 最初の敵にダメージ演出
        if (this.enemyParty.length > 0 && this.enemyDisplay) {
            this.enemyDisplay.playDamageAnimation(0);
            
            // サンプルダメージ処理
            setTimeout(() => {
                const currentHp = parseInt(this.enemyParty[0].currentHp || this.enemyParty[0].hp);
                const newHp = Math.max(0, currentHp - 30);
                this.enemyDisplay.updateEnemyHp(0, newHp);
            }, 250);
        }
    }
}

// カスタム要素として登録
customElements.define('battle-scene', BattleScene);