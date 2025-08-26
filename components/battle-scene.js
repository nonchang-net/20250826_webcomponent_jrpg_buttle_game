/**
 * JRPGバトルシーンコンポーネント
 * ドラゴンクエスト風のバトル画面を提供する
 * 分割されたコンポーネント（enemy-display, party-status, command-menu）を統合管理する
 */
class BattleScene extends HTMLElement {
    constructor() {
        super();
        this.actors = {};
        this.inventories = {};
        this.playerParty = [];
        this.enemyParty = [];
        this.enemyDisplay = null;
        this.partyStatus = null;
        this.commandMenu = null;
        this.messageDisplay = null;
        this.init();
    }

    /**
     * 初期化処理
     * MasterDataからアクターデータとインベントリデータを読み込み、バトル画面を構築する
     */
    async init() {
        await this.loadMasterData();
        this.setupBattleField();
        this.render();
    }

    /**
     * マスターデータを読み込む
     * アクターデータとインベントリデータを並行読み込みする
     */
    async loadMasterData() {
        try {
            const [actorsResponse, inventoriesResponse] = await Promise.all([
                fetch('./MasterData/actors.json'),
                fetch('./MasterData/inventories.json')
            ]);
            
            this.actors = await actorsResponse.json();
            this.inventories = await inventoriesResponse.json();
            this.setupParties();
        } catch (error) {
            console.error('マスターデータの読み込みに失敗しました:', error);
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
     * 現在のプレイヤー（勇者）が使用可能な道具を取得する
     * @returns {Array} 道具の配列
     */
    getAvailableItems() {
        const items = [];
        
        // 勇者のキャラクターを取得（プレイヤーパーティの最初のメンバーを勇者とする）
        const hero = this.playerParty.find(member => member.name === '勇者') || this.playerParty[0];
        
        if (hero && hero.inventories && Array.isArray(hero.inventories)) {
            hero.inventories.forEach(inventory => {
                const inventoryData = this.inventories[inventory.inventory_id];
                if (inventoryData && (inventoryData.type === 'item' || inventoryData.type === 'weapon')) {
                    items.push({
                        id: inventory.inventory_id,
                        name: inventoryData.name,
                        quantity: 1 // TODO: 実際の数量管理が必要な場合は実装
                    });
                }
            });
        }
        
        return items;
    }

    /**
     * 現在のプレイヤー（勇者）が使用可能な魔法を取得する
     * @returns {Array} 魔法の配列
     */
    getAvailableMagic() {
        const spells = [];
        
        // 勇者のキャラクターを取得（プレイヤーパーティの最初のメンバーを勇者とする）
        const hero = this.playerParty.find(member => member.name === '勇者') || this.playerParty[0];
        
        if (hero && hero.inventories && Array.isArray(hero.inventories)) {
            hero.inventories.forEach(inventory => {
                const inventoryData = this.inventories[inventory.inventory_id];
                if (inventoryData && inventoryData.type === 'magic') {
                    spells.push({
                        id: inventory.inventory_id,
                        name: inventoryData.name,
                        mpCost: 5, // TODO: マスターデータに追加が必要
                        availableMp: 50 // TODO: キャラクターの実際のMPを参照
                    });
                }
            });
        }
        
        return spells;
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
                    height: 250px;
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
                
                <message-display id="message-display"></message-display>
            </div>
        `;
        
        // 子コンポーネントの参照を取得
        this.enemyDisplay = this.querySelector('#enemy-display');
        this.partyStatus = this.querySelector('#party-status');
        this.commandMenu = this.querySelector('#command-menu');
        this.messageDisplay = this.querySelector('#message-display');
        
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
            case 'fight':
                console.log('戦うを選択しました');
                this.messageDisplay.showBattleEvent('turn', { character: '勇者' });
                this.commandMenu.showTargetSelection();
                // 実際の攻撃処理（デモ用）
                setTimeout(() => {
                    this.performAttack();
                    this.commandMenu.showMainMenu();
                    this.commandMenu.resetSelection();
                }, 1000);
                break;
            case 'defend':
                console.log('防御を選択しました');
                this.messageDisplay.addMessage('勇者は身を守っている！');
                // 防御効果を適用（実装は後で）
                setTimeout(() => {
                    this.commandMenu.showMainMenu();
                    this.commandMenu.resetSelection();
                }, 1000);
                break;
            case 'magic':
                console.log('魔法を選択しました');
                // マスターデータから魔法を取得
                const spells = this.getAvailableMagic();
                this.commandMenu.showMagicMenu(spells);
                break;
            case 'item':
                console.log('道具を選択しました');
                // マスターデータから道具を取得
                const items = this.getAvailableItems();
                this.commandMenu.showItemMenu(items);
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
            
            // 攻撃メッセージを表示
            this.messageDisplay.showBattleEvent('attack', {
                attacker: '勇者',
                target: this.enemyParty[0].name,
                damage: 30
            });
            
            // サンプルダメージ処理
            setTimeout(() => {
                const currentHp = parseInt(this.enemyParty[0].currentHp || this.enemyParty[0].hp);
                const newHp = Math.max(0, currentHp - 30);
                this.enemyDisplay.updateEnemyHp(0, newHp);
                
                // 敵が倒れた場合のメッセージ
                if (newHp <= 0) {
                    this.messageDisplay.addMessage(`${this.enemyParty[0].name}を倒した！`);
                }
            }, 250);
        }
    }
}

// カスタム要素として登録
customElements.define('battle-scene', BattleScene);