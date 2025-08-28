/**
 * JRPGバトルシーンコンポーネント
 * ドラゴンクエスト風のバトル画面を提供する
 * 分割されたコンポーネント（enemy-display, party-status, command-menu）を統合管理する
 * battle-scene-display.jsによりUI表示機能を分離し、このクラスはモジュール統合の役割を担う
 */
class BattleScene extends HTMLElement {
    constructor() {
        super();
        this.actors = {};
        this.inventories = {};
        this.commands = {};
        this.messages = {};
        this.locale = 'ja'; // ロケール設定（将来的にオプション設定で変更可能）
        this.playerParty = [];
        this.enemyParty = [];
        this.battleFlowController = null;
        this.display = null;
        this.init();
    }

    /**
     * 初期化処理
     * MasterDataからアクターデータとインベントリデータを読み込み、バトル画面を構築する
     */
    async init() {
        await this.loadMasterData();
        this.initializeDisplay();
        this.setupBattleField();
        this.render();
        this.initializeBattleFlow();
    }

    /**
     * 表示管理クラスを初期化する
     */
    initializeDisplay() {
        this.display = new BattleSceneDisplay(this);
    }

    /**
     * マスターデータを読み込む
     * アクターデータ、インベントリデータ、コマンドデータ、メッセージデータを並行読み込みする
     */
    async loadMasterData() {
        try {
            const [actorsResponse, inventoriesResponse, commandsResponse, messagesResponse] = await Promise.all([
                fetch('./MasterData/actors.json'),
                fetch('./MasterData/inventories.json'),
                fetch('./MasterData/commands.json'),
                fetch('./MasterData/messages.json')
            ]);
            
            this.actors = await actorsResponse.json();
            this.inventories = await inventoriesResponse.json();
            this.commands = await commandsResponse.json();
            this.messages = await messagesResponse.json();
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
                // プレイヤーはActorクラスのインスタンスとして作成
                const actorInstance = new Actor(actorWithId, this.actors, this.inventories);
                this.playerParty.push(actorInstance);
            } else {
                // 敵はEnemyクラスのインスタンスとして作成
                const enemyInstance = new Enemy(actorWithId, this.actors, this.inventories, this.commands);
                this.enemyParty.push(enemyInstance);
            }
        });
    }

    /**
     * バトルフィールドの設定
     */
    setupBattleField() {
        // 表示管理クラスからHTML構造を取得
        this.innerHTML = this.display.setupBattleFieldHTML();
        
        // 子コンポーネントの参照を表示管理クラスで初期化
        this.display.initializeComponentReferences(this);
        
        // イベントリスナーを設定
        this.setupEventListeners();
    }

    /**
     * 画面を描画する
     */
    render() {
        if (this.display) {
            this.display.render(this.playerParty, this.enemyParty);
        }
    }

    /**
     * バトルフローコントローラーを初期化する
     */
    initializeBattleFlow() {
        // BattleFlowControllerを初期化
        this.battleFlowController = new BattleFlowController(
            this.actors,
            this.inventories,
            this.commands,
            this.messages,
            this.locale,
            this.playerParty,
            this.enemyParty
        );

        // メッセージコールバックを設定
        this.battleFlowController.setMessageCallback((message) => {
            if (this.display && this.display.messageDisplay) {
                this.display.messageDisplay.addMessage(message);
                // メッセージ追加後にUI操作状態を更新
                setTimeout(() => {
                    if (this.display) {
                        this.display.updateUIInteractionState();
                    }
                }, 100);
            }
        });

        // UI更新コールバックを設定
        this.battleFlowController.setUIUpdateCallback((type, data) => {
            if (this.display) {
                this.display.handleBattleUIUpdate(type, data, this.playerParty, this.enemyParty);
                // UI更新後に操作状態を更新
                this.display.updateUIInteractionState();
            }
        });

        // キーボードイベントリスナーを追加（Escキー対応）
        document.addEventListener('keydown', async (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (await this.battleFlowController.cancelLastAction()) {
                    console.log('前の行動がキャンセルされました');
                }
            }
        });

        // バトル開始
        setTimeout(() => {
            this.battleFlowController.startBattle('turn_based');
        }, 1000);
    }


    /**
     * イベントリスナーを設定する
     */
    setupEventListeners() {
        // コマンドメニューからのイベント
        this.addEventListener('command-selected', async (event) => {
            await this.handleCommand(event.detail.command);
        });
        
        // 敵選択イベント
        this.addEventListener('enemy-selected', async (event) => {
            const selectedEnemy = event.detail.enemy;
            const currentPlayer = this.battleFlowController ? this.battleFlowController.getCurrentPlayer() : null;
            
            if (this.battleFlowController && currentPlayer) {
                // 攻撃行動をBattleFlowControllerに設定
                await this.battleFlowController.setPlayerAction(currentPlayer, 'fight', selectedEnemy);
            }
        });
        
        // パーティメンバー選択イベント
        this.addEventListener('member-selected', (event) => {
            console.log('パーティメンバーが選択されました:', event.detail.member.name);
        });
        
        // アイテム選択イベント
        this.addEventListener('item-selected', async (event) => {
            const itemId = event.detail.itemId;
            const currentPlayer = this.battleFlowController ? this.battleFlowController.getCurrentPlayer() : null;
            
            if (this.battleFlowController && currentPlayer) {
                // アイテム使用行動をBattleFlowControllerに設定
                await this.battleFlowController.setPlayerAction(currentPlayer, 'item', currentPlayer, { itemId: itemId });
            }
        });
        
        // 魔法選択イベント
        this.addEventListener('magic-selected', async (event) => {
            const spellId = event.detail.spellId;
            const currentPlayer = this.battleFlowController ? this.battleFlowController.getCurrentPlayer() : null;
            
            if (this.battleFlowController && currentPlayer) {
                // 魔法行動をBattleFlowControllerに設定
                await this.battleFlowController.setPlayerAction(currentPlayer, 'magic', currentPlayer, { spellId: spellId });
            }
        });

        // 再プレイ選択イベント
        this.addEventListener('replay-selected', (event) => {
            if (this.battleFlowController) {
                // バトルを再開始
                this.battleFlowController.restartBattle();
            }
        });
    }

    /**
     * コマンド処理
     * @param {string} command - 実行するコマンド
     */
    async handleCommand(command) {
        if (!this.battleFlowController) {
            console.error('BattleFlowController is not initialized');
            return;
        }

        // 現在行動選択中のプレイヤーを取得
        const currentPlayer = this.battleFlowController.getCurrentPlayer();
        if (!currentPlayer) {
            console.error('No current player found');
            return;
        }

        switch(command) {
            case 'fight':
                // ターゲット選択画面を表示
                if (this.display && this.display.commandMenu) {
                    this.display.commandMenu.showTargetSelection();
                }
                break;
                
            case 'defend':
                // 防御行動をBattleFlowControllerに設定
                await this.battleFlowController.setPlayerAction(currentPlayer, 'defend', currentPlayer);
                break;
                
            case 'magic':
                // 利用可能な魔法を取得して表示
                const spells = this.battleFlowController.getAvailableMagic(currentPlayer);
                if (this.display && this.display.commandMenu) {
                    this.display.commandMenu.showMagicMenu(spells);
                }
                break;
                
            case 'item':
                // 利用可能なアイテムを取得して表示
                const items = this.battleFlowController.getAvailableItems(currentPlayer);
                if (this.display && this.display.commandMenu) {
                    this.display.commandMenu.showItemMenu(items);
                }
                break;
        }
    }

}

// カスタム要素として登録
customElements.define('battle-scene', BattleScene);