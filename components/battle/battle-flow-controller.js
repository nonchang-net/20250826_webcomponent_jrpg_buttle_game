/**
 * バトルフロー制御クラス
 * 複数のバトルルールを管理し、UIとの統合を行う
 */
class BattleFlowController {
    constructor(actors, inventories, commands, playerParty, enemyParty) {
        this.actors = actors;
        this.inventories = inventories;
        this.commands = commands;
        this.playerParty = playerParty;
        this.enemyParty = enemyParty;
        
        this.currentBattleRule = null;
        this.availableRules = new Map();
        this.stateManager = new BattleStateManager();
        this.actionResolver = new ActionResolver(actors, inventories, commands);
        
        // UI連携用コールバック
        this.messageCallback = null;
        this.uiUpdateCallback = null;
        
        this.registerBattleRules();
    }

    /**
     * 利用可能なバトルルールを登録する
     */
    registerBattleRules() {
        // ターン制バトルルールを登録
        this.availableRules.set('turn_based', TurnBasedBattleRule);
        // 将来的に他のバトルルールを追加可能
        // this.availableRules.set('real_time', RealTimeBattleRule);
        // this.availableRules.set('time_based', TimeBasedBattleRule);
    }

    /**
     * バトルルールを設定する
     * @param {string} ruleType - バトルルールタイプ
     */
    setBattleRule(ruleType = 'turn_based') {
        const RuleClass = this.availableRules.get(ruleType);
        if (!RuleClass) {
            throw new Error(`Unknown battle rule type: ${ruleType}`);
        }

        this.currentBattleRule = new RuleClass(
            this.actors,
            this.inventories,
            this.playerParty,
            this.enemyParty,
            this.actionResolver
        );

        // コールバックを設定
        this.currentBattleRule.setMessageCallback((message) => {
            this.handleMessage(message);
        });
        
        this.currentBattleRule.setUIUpdateCallback((type, data) => {
            this.handleUIUpdate(type, data);
        });
    }

    /**
     * バトルを開始する
     * @param {string} ruleType - 使用するバトルルール（デフォルト: 'turn_based'）
     */
    startBattle(ruleType = 'turn_based') {
        try {
            // バトルルールを設定
            this.setBattleRule(ruleType);
            
            // 状態をリセット
            this.stateManager.reset();
            
            // バトル開始
            this.currentBattleRule.initializeBattle();
            this.currentBattleRule.startBattle();
            
            this.stateManager.setPhase('battle_active');
            
        } catch (error) {
            console.error('Failed to start battle:', error);
            this.handleMessage(`バトル開始に失敗しました: ${error.message}`);
        }
    }

    /**
     * プレイヤー行動を設定する
     * @param {Object} actor - 行動するアクター
     * @param {string} actionType - 行動タイプ
     * @param {Object} target - ターゲット
     * @param {Object} params - 追加パラメーター
     */
    setPlayerAction(actor, actionType, target, params = {}) {
        if (!this.currentBattleRule) {
            console.error('No battle rule is active');
            return;
        }

        try {
            this.currentBattleRule.setPlayerAction(actor, actionType, target, params);
            
            // 状態管理に記録
            this.stateManager.addPlayerAction({
                actor: actor,
                type: actionType,
                target: target,
                params: params
            });
            
        } catch (error) {
            console.error('Failed to set player action:', error);
            this.handleMessage(`行動設定に失敗しました: ${error.message}`);
        }
    }

    /**
     * 前の行動をキャンセルする（Escキー対応）
     */
    cancelLastAction() {
        if (!this.currentBattleRule) {
            return false;
        }

        try {
            const success = this.currentBattleRule.cancelLastAction();
            if (success) {
                this.stateManager.removeLastPlayerAction();
            }
            return success;
        } catch (error) {
            console.error('Failed to cancel action:', error);
            return false;
        }
    }

    /**
     * バトルを終了する
     */
    endBattle() {
        if (this.currentBattleRule) {
            this.stateManager.setPhase('battle_end');
        }
    }

    /**
     * バトルをリスタートする
     */
    restartBattle() {
        if (this.currentBattleRule) {
            this.currentBattleRule.restartBattle();
            this.stateManager.reset();
            this.stateManager.setPhase('battle_active');
        }
    }

    /**
     * 現在のバトル状態を取得する
     * @returns {Object} バトル状態
     */
    getBattleState() {
        return {
            rule: this.currentBattleRule ? this.currentBattleRule.constructor.name : null,
            state: this.stateManager.getState(),
            playerParty: this.playerParty.map(p => ({
                name: p.name,
                currentHp: p.currentHp,
                maxHp: p.maxHp,
                currentMp: p.currentMp,
                maxMp: p.maxMp,
                alive: p.currentHp > 0
            })),
            enemyParty: this.enemyParty.map(e => ({
                name: e.name,
                currentHp: e.currentHp,
                maxHp: e.maxHp,
                alive: e.currentHp > 0
            }))
        };
    }

    /**
     * 利用可能なアイテムを取得する（現在のプレイヤー用）
     * @param {Object} currentPlayer - 現在のプレイヤー
     * @returns {Array} 利用可能なアイテム配列
     */
    getAvailableItems(currentPlayer) {
        if (!currentPlayer || !currentPlayer.inventoryItems) {
            return [];
        }

        return currentPlayer.inventoryItems
            .map(inventory => {
                const itemData = this.inventories[inventory.inventory_id];
                if (itemData && (itemData.type === 'item' || itemData.type === 'weapon')) {
                    return {
                        id: inventory.inventory_id,
                        name: itemData.name,
                        quantity: inventory.quantity || 1
                    };
                }
                return null;
            })
            .filter(item => item !== null);
    }

    /**
     * 利用可能な魔法を取得する（現在のプレイヤー用）
     * @param {Object} currentPlayer - 現在のプレイヤー
     * @returns {Array} 利用可能な魔法配列
     */
    getAvailableMagic(currentPlayer) {
        if (!currentPlayer || !currentPlayer.inventoryItems) {
            return [];
        }

        return currentPlayer.inventoryItems
            .map(inventory => {
                const spellData = this.inventories[inventory.inventory_id];
                if (spellData && spellData.type === 'magic') {
                    const mpCost = this.actionResolver.getMagicMpCost ? 
                        this.actionResolver.getMagicMpCost(spellData) : 5;
                    
                    return {
                        id: inventory.inventory_id,
                        name: spellData.name,
                        mpCost: mpCost,
                        availableMp: currentPlayer.currentMp || 50
                    };
                }
                return null;
            })
            .filter(item => item !== null);
    }

    /**
     * メッセージコールバックを設定する
     * @param {Function} callback - メッセージコールバック
     */
    setMessageCallback(callback) {
        this.messageCallback = callback;
    }

    /**
     * UI更新コールバックを設定する
     * @param {Function} callback - UI更新コールバック
     */
    setUIUpdateCallback(callback) {
        this.uiUpdateCallback = callback;
    }

    /**
     * メッセージを処理する
     * @param {string} message - メッセージ
     */
    handleMessage(message) {
        if (this.messageCallback) {
            this.messageCallback(message);
        } else {
            console.log('Battle Message:', message);
        }
    }

    /**
     * UI更新を処理する
     * @param {string} type - 更新タイプ
     * @param {Object} data - 更新データ
     */
    handleUIUpdate(type, data) {
        if (this.uiUpdateCallback) {
            this.uiUpdateCallback(type, data);
        } else {
            console.log('Battle UI Update:', type, data);
        }
    }

    /**
     * キーボード入力を処理する
     * @param {string} key - 押されたキー
     * @returns {boolean} 処理されたかどうか
     */
    handleKeyInput(key) {
        switch (key) {
            case 'Escape':
                return this.cancelLastAction();
            default:
                return false;
        }
    }

    /**
     * 状態変更リスナーを追加する
     * @param {Function} listener - リスナー関数
     */
    addStateChangeListener(listener) {
        this.stateManager.addStateChangeListener(listener);
    }

    /**
     * 状態変更リスナーを削除する
     * @param {Function} listener - リスナー関数
     */
    removeStateChangeListener(listener) {
        this.stateManager.removeStateChangeListener(listener);
    }

    /**
     * バトルルール情報を取得する
     * @returns {Object} バトルルール情報
     */
    getBattleRuleInfo() {
        return {
            current: this.currentBattleRule ? this.currentBattleRule.constructor.name : null,
            available: Array.from(this.availableRules.keys())
        };
    }

    /**
     * 現在行動選択中のプレイヤーを取得する
     * @returns {Object|null} 現在のプレイヤー
     */
    getCurrentPlayer() {
        if (!this.currentBattleRule || !this.currentBattleRule.getAlivePlayerByIndex) {
            return null;
        }
        
        // TurnBasedBattleRuleの場合
        if (this.currentBattleRule.constructor.name === 'TurnBasedBattleRule') {
            return this.currentBattleRule.getAlivePlayerByIndex(this.currentBattleRule.currentPlayerIndex);
        }
        
        return null;
    }

}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleFlowController;
} else {
    window.BattleFlowController = BattleFlowController;
}