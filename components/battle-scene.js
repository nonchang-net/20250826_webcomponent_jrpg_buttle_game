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
        this.pendingAction = null; // ターゲット選択時の一時アクション保存用
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
                
                // 最初のキャラクターの場合はキャンセルできない
                if (this.battleFlowController && this.battleFlowController.currentBattleRule) {
                    const currentPlayerIndex = this.battleFlowController.currentBattleRule.currentPlayerIndex;
                    if (currentPlayerIndex <= 0) {
                        return; // 最初のプレイヤーはキャンセル不可
                    }
                }
                
                // (1) Escキー押下時に即座にコマンドメニューを非表示
                if (this.display && this.display.commandMenu) {
                    this.display.setCommandMenuVisibility(false);
                }
                
                if (await this.battleFlowController.cancelLastAction()) {
                    // (2) 200ms後にコマンドメニューを再表示（メッセージ表示完了を待たない）
                    setTimeout(() => {
                        if (this.display && this.display.commandMenu) {
                            this.display.setCommandMenuVisibility(true);
                            this.display.commandMenu.showMainMenu();
                        }
                        
                        // アクティブプレイヤー表示を更新
                        if (this.display && this.display.partyStatus && this.battleFlowController) {
                            const currentPlayer = this.battleFlowController.getCurrentPlayer();
                            this.display.partyStatus.setActivePlayer(currentPlayer);
                        }
                    }, 200);
                } else {
                    // キャンセルできなかった場合はコマンドメニューを再表示
                    if (this.display && this.display.commandMenu) {
                        this.display.setCommandMenuVisibility(true);
                    }
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
        
        
        // ターゲット選択イベント（新しいコマンドメニュー用）
        this.addEventListener('target-selected', async (event) => {
            const selectedTarget = event.detail.target;
            const currentPlayer = this.battleFlowController ? this.battleFlowController.getCurrentPlayer() : null;
            
            if (this.battleFlowController && currentPlayer && this.pendingAction) {
                // 行動確定時にコマンドメニューを即座に非表示
                if (this.display && this.display.commandMenu) {
                    this.display.setCommandMenuVisibility(false);
                }
                
                // pendingActionの情報を使用してアクションを設定
                const { actionId, actionType, targetType } = this.pendingAction;
                
                if (actionType === 'item') {
                    // アイテム使用処理
                    this.onTargetSelected(actionId, actionType, targetType, selectedTarget, 0);
                } else if (actionType === 'magic') {
                    // 魔法使用処理
                    this.onTargetSelected(actionId, actionType, targetType, selectedTarget, 0);
                } else if (actionType === 'fight') {
                    // 攻撃行動をBattleFlowControllerに設定
                    await this.battleFlowController.setPlayerAction(currentPlayer, 'fight', selectedTarget);
                } else {
                    // その他の行動
                    console.warn('未対応のactionType:', actionType);
                }
                
                // pendingActionをクリア
                this.pendingAction = null;
            }
        });
        
        
        // アイテム選択イベント
        this.addEventListener('item-selected', async (event) => {
            const itemId = event.detail.itemId;
            const currentPlayer = this.battleFlowController ? this.battleFlowController.getCurrentPlayer() : null;
            
            // console.log('アイテム選択イベント受信:', { itemId, currentPlayer: currentPlayer?.name });
            
            if (this.battleFlowController && currentPlayer) {
                // console.log('バトルフローコントローラーとプレイヤー確認OK');
                
                // アイテムの消費チェック
                const hasItem = currentPlayer.hasItem(itemId, 1);
                // console.log('アイテム所持チェック:', hasItem);
                
                if (!hasItem) {
                    // アイテムが不足している場合
                    const itemName = this.getItemName(itemId);
                    // console.log('アイテム不足:', itemName);
                    this.display.messageDisplay.showMessage(`${itemName}が足りない！`);
                    
                    // コマンドメニューを再表示
                    setTimeout(() => {
                        if (this.display && this.display.commandMenu) {
                            this.display.setCommandMenuVisibility(true);
                        }
                    }, 1000);
                    return;
                }
                
                // マクロコマンドを取得してターゲット選択が必要かチェック
                // console.log('ターゲット選択チェック開始');
                const needsTargetSelection = this.checkIfItemNeedsTargetSelection(itemId);
                // console.log('ターゲット選択必要か:', needsTargetSelection);
                
                if (needsTargetSelection) {
                    // ターゲット選択が必要な場合
                    const targetType = this.getItemTargetType(itemId);
                    // console.log('ターゲットタイプ:', targetType);
                    // console.log('ターゲット選択表示開始');
                    await this.showTargetSelection(itemId, targetType, 'item');
                } else {
                    // ターゲット選択が不要な場合（全体効果など）
                    // console.log('ターゲット選択不要、直接実行');
                    if (this.display && this.display.commandMenu) {
                        this.display.setCommandMenuVisibility(false);
                    }
                    
                    await this.battleFlowController.setPlayerAction(currentPlayer, 'item', currentPlayer, { itemId: itemId });
                }
            } else {
                console.error('バトルフローコントローラーまたはプレイヤーが無効:', { 
                    battleFlowController: !!this.battleFlowController, 
                    currentPlayer: !!currentPlayer 
                });
            }
        });
        
        // 魔法選択イベント
        this.addEventListener('magic-selected', async (event) => {
            const spellId = event.detail.spellId;
            const currentPlayer = this.battleFlowController ? this.battleFlowController.getCurrentPlayer() : null;
            
            if (this.battleFlowController && currentPlayer) {
                // 行動確定時にコマンドメニューを即座に非表示
                if (this.display && this.display.commandMenu) {
                    this.display.setCommandMenuVisibility(false);
                }
                
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
                // ペンディングアクションを設定
                this.pendingAction = {
                    actionId: 'fight',
                    actionType: 'fight',
                    targetType: 'enemy'
                };
                
                // 生存している敵のリストを取得してターゲット選択画面を表示
                if (this.display && this.display.commandMenu) {
                    const aliveEnemies = this.enemyParty.filter(enemy => enemy.currentHp > 0);
                    this.display.commandMenu.showTargetSelection(aliveEnemies);
                }
                break;
                
            case 'defend':
                // 行動確定時にコマンドメニューを即座に非表示
                if (this.display && this.display.commandMenu) {
                    this.display.setCommandMenuVisibility(false);
                }
                
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
                // console.log('道具コマンド選択');
                // 利用可能なアイテムを取得して表示
                const items = this.battleFlowController.getAvailableItems(currentPlayer);
                // console.log('利用可能アイテム:', items);
                if (this.display && this.display.commandMenu) {
                    this.display.commandMenu.showItemMenu(items);
                }
                break;
        }
    }

    /**
     * アイテム名を取得する
     * @param {string} itemId - アイテムID
     * @returns {string} アイテム名
     */
    getItemName(itemId) {
        const battleRule = this.battleFlowController?.currentBattleRule;
        const inventoriesDatabase = battleRule?.inventoriesDatabase;
        if (inventoriesDatabase && inventoriesDatabase[itemId]) {
            return inventoriesDatabase[itemId].name;
        }
        return 'アイテム';
    }

    /**
     * アイテムがターゲット選択を必要とするかチェックする
     * @param {string} itemId - アイテムID
     * @returns {boolean} ターゲット選択が必要かどうか
     */
    checkIfItemNeedsTargetSelection(itemId) {
        // console.log('checkIfItemNeedsTargetSelection開始:', itemId);
        
        const battleRule = this.battleFlowController?.currentBattleRule;
        // console.log('battleRule取得:', !!battleRule);
        const inventoriesDatabase = battleRule?.inventoriesDatabase;
        // console.log('inventoriesDatabase取得:', !!inventoriesDatabase);
        
        if (!inventoriesDatabase || !inventoriesDatabase[itemId]) {
            console.error('アイテムデータが見つからない');
            return false;
        }

        const itemData = inventoriesDatabase[itemId];
        // console.log('アイテムデータ取得:', itemData);
        const commands = itemData.commands || [];
        // console.log('コマンド数:', commands.length);

        for (const command of commands) {
            // console.log('コマンド処理中:', command.command_id);
            const commandsDatabase = battleRule?.commandsDatabase;
            // console.log('commandsDatabase取得:', !!commandsDatabase);
            
            if (commandsDatabase && commandsDatabase[command.command_id]) {
                const commandData = commandsDatabase[command.command_id];
                // console.log('コマンドデータ取得:', commandData.name);
                const subCommands = commandData.sub_commands || [];
                // console.log('サブコマンド数:', subCommands.length);
                
                // 全体ターゲット設定コマンドがあるかチェック
                const hasWholeTarget = subCommands.some(subCmd => 
                    subCmd.command_id === '23ca1336-358d-461b-8e74-20beebe59f98'
                );
                // console.log('全体ターゲット設定:', hasWholeTarget);
                
                if (hasWholeTarget) {
                    // console.log('全体効果のためターゲット選択不要');
                    return false; // 全体効果なのでターゲット選択不要
                }

                // 味方対象または相手対象コマンドがあるかチェック
                const hasTargetCommand = subCommands.some(subCmd => 
                    subCmd.command_id === '00d103f0-f9e1-4b61-a5c4-bf211a205412' || // 味方を対象とする
                    subCmd.command_id === 'a2540dff-b99d-4409-9f92-e113bf66c837'   // 相手を対象とする
                );
                // console.log('ターゲットコマンド:', hasTargetCommand);
                
                if (hasTargetCommand) {
                    // console.log('ターゲット選択必要');
                    return true; // ターゲット選択が必要
                }
            } else {
                console.error('コマンドデータが見つからない:', command.command_id);
            }
        }
        
        // console.log('デフォルトでターゲット選択不要');
        return false;
    }

    /**
     * アイテムのターゲットタイプを取得する
     * @param {string} itemId - アイテムID
     * @returns {string} 'friend' または 'enemy'
     */
    getItemTargetType(itemId) {
        const battleRule = this.battleFlowController?.currentBattleRule;
        const inventoriesDatabase = battleRule?.inventoriesDatabase;
        if (!inventoriesDatabase || !inventoriesDatabase[itemId]) {
            return 'friend';
        }

        const itemData = inventoriesDatabase[itemId];
        const commands = itemData.commands || [];

        for (const command of commands) {
            const commandsDatabase = battleRule?.commandsDatabase;
            if (commandsDatabase && commandsDatabase[command.command_id]) {
                const commandData = commandsDatabase[command.command_id];
                const subCommands = commandData.sub_commands || [];
                
                // 味方対象コマンドをチェック
                const hasFriendTarget = subCommands.some(subCmd => 
                    subCmd.command_id === '00d103f0-f9e1-4b61-a5c4-bf211a205412'
                );
                
                if (hasFriendTarget) {
                    return 'friend';
                }

                // 相手対象コマンドをチェック
                const hasEnemyTarget = subCommands.some(subCmd => 
                    subCmd.command_id === 'a2540dff-b99d-4409-9f92-e113bf66c837'
                );
                
                if (hasEnemyTarget) {
                    return 'enemy';
                }
            }
        }
        
        return 'friend'; // デフォルトは味方
    }

    /**
     * ターゲット選択画面を表示する
     * @param {string} actionId - アクションID（アイテムIDまたは魔法ID）
     * @param {string} targetType - 'friend' または 'enemy'
     * @param {string} actionType - 'item' または 'magic'
     */
    async showTargetSelection(actionId, targetType, actionType) {
        if (!this.display || !this.display.commandMenu) {
            console.error('Command menu not available');
            return;
        }

        let targets = [];

        if (targetType === 'friend') {
            targets = this.battleFlowController.currentBattleRule.playerParty.map(player => ({
                id: player.id,
                name: player.name,
                currentHp: player.currentHp,
                maxHp: player.maxHp,
                currentMp: player.currentMp,
                maxMp: player.maxMp
            }));
        } else {
            targets = this.battleFlowController.currentBattleRule.enemyParty
                .filter(enemy => enemy.currentHp > 0) // 生存している敵のみ
                .map(enemy => ({
                    id: enemy.id,
                    name: enemy.name,
                    currentHp: enemy.currentHp,
                    maxHp: enemy.maxHp,
                    currentMp: enemy.currentMp || 0,
                    maxMp: enemy.maxMp || 0
                }));
        }
        
        // コマンドメニューでターゲット選択画面を表示
        this.display.commandMenu.showTargetSelection(targets);
        
        // ターゲット選択用の一時データを保存
        this.pendingAction = {
            actionId: actionId,
            actionType: actionType,
            targetType: targetType
        };
    }

    /**
     * ターゲット選択完了時の処理
     * @param {string} actionId - アクションID
     * @param {string} actionType - アクションタイプ
     * @param {string} targetType - ターゲットタイプ
     * @param {Object} selectedTarget - 選択されたターゲット
     * @param {number} targetIndex - ターゲットインデックス
     */
    async onTargetSelected(actionId, actionType, targetType, selectedTarget, targetIndex) {
        const currentPlayer = this.battleFlowController.getCurrentPlayer();
        if (!currentPlayer) return;

        // selectedTargetを直接使用（より確実）
        const actualTarget = selectedTarget;

        if (!actualTarget) {
            console.error('Selected target not found');
            return;
        }

        // 行動を設定
        const actionData = actionType === 'item' ? { itemId: actionId } : { spellId: actionId };
        await this.battleFlowController.setPlayerAction(currentPlayer, actionType, actualTarget, actionData);
    }

    /**
     * ターゲット選択キャンセル時の処理
     */
    onTargetSelectionCancelled() {
        // コマンドメニューを再表示
        if (this.display && this.display.commandMenu) {
            this.display.setCommandMenuVisibility(true);
        }
    }

}

// カスタム要素として登録
customElements.define('battle-scene', BattleScene);