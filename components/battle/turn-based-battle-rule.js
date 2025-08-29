/**
 * ターン制バトルルール実装クラス
 * battle_rule_1.mdで定義されたターン制バトルシステムを実装する
 * 
 * デバッグ用ログ:
 * - 各メソッドには "// DEBUG" とマークされたconsole.logが含まれています
 * - 必要に応じてコメントアウトを解除してデバッグに活用してください
 */
class TurnBasedBattleRule extends BattleRuleBase {
    // メッセージ表示完了後の待機時間定数
    static MESSAGE_COMPLETION_WAIT_TIME = 800; // メッセージ表示完了後の待機時間（ミリ秒）
    constructor(actors, inventories, messages, locale, playerParty, enemyParty, actionResolver, stateManager) {
        super(actors, inventories, messages, locale, playerParty, enemyParty, actionResolver);
        
        this.stateManager = stateManager;
        
        // バトル状態管理
        this.phase = 'initial'; // 'initial', 'player_selection', 'turn_execution', 'battle_end'
        this.currentPlayerIndex = 0;
        this.playerActions = [];
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        
        // 行動キャンセル履歴
        this.actionHistory = [];
        
        // メッセージマネージャー
        this.messageManager = new MessageManager(locale);
    }

    /**
     * フェーズを変更し、StateManagerに反映する
     * @param {string} newPhase - 新しいフェーズ
     */
    setPhase(newPhase) {
        // console.log('フェーズ変更:', this.phase, '->', newPhase); // DEBUG
        this.phase = newPhase;
        if (this.stateManager) {
            this.stateManager.setPhase(newPhase);
        }
    }

    /**
     * バトル開始時の初期化処理
     */
    initializeBattle() {
        // HP/MPを初期化
        this.initializeAllStats();
        
        // バトル開始
        this.setPhase('initial');
    }

    /**
     * バトルを開始する
     */
    async startBattle() {
        // console.log('TurnBasedBattleRule: startBattle開始'); // DEBUG
        
        // ランダムで先攻後攻を決定
        const isEnemyFirst = Math.random() < 0.5;
        // console.log('先攻判定:', isEnemyFirst ? '敵先攻' : 'プレイヤー先攻'); // DEBUG
        
        if (isEnemyFirst) {
            // 1a: 敵先攻
            // console.log('敵先攻パターンを実行'); // DEBUG
            await this.showMessageAndWait(this.messageManager.buildBattleStatusMessage('enemy_appears'));
            this.executeEnemyTurn();
        } else {
            // 1b: プレイヤー先攻
            // console.log('プレイヤー先攻パターンを実行'); // DEBUG
            await this.showMessageAndWait(this.messageManager.buildBattleStatusMessage('enemy_appears_player_first'));
            await this.startPlayerActionSelection();
        }
        
        // console.log('TurnBasedBattleRule: startBattle完了'); // DEBUG
    }

    /**
     * ユーザー行動選択を開始する
     */
    async startPlayerActionSelection() {
        // console.log('startPlayerActionSelection開始'); // DEBUG
        this.setPhase('player_selection');
        this.currentPlayerIndex = 0;
        this.playerActions = [];
        // console.log('フェーズを player_selection に変更'); // DEBUG
        await this.selectNextPlayerAction();
        // console.log('startPlayerActionSelection完了'); // DEBUG
    }

    /**
     * 次のプレイヤーの行動選択を促す
     */
    async selectNextPlayerAction() {
        // console.log('selectNextPlayerAction開始, currentPlayerIndex:', this.currentPlayerIndex); // DEBUG
        
        const alivePlayersCount = this.playerParty.filter(p => p.isAlive()).length;
        // console.log('生存プレイヤー数:', alivePlayersCount); // DEBUG
        
        if (this.currentPlayerIndex >= alivePlayersCount) {
            // 全員の行動が決定したので、ターン実行へ
            // console.log('全員の行動決定、ターン実行開始'); // DEBUG
            this.executeTurn();
            return;
        }

        const currentPlayer = this.getAlivePlayerByIndex(this.currentPlayerIndex);
        // console.log('現在のプレイヤー:', currentPlayer ? currentPlayer.name : 'null'); // DEBUG
        
        if (currentPlayer) {
            // StateManagerに現在のプレイヤーを設定
            if (this.stateManager) {
                this.stateManager.setCurrentPlayer(currentPlayer);
            }
            
            // プレイヤー選択メッセージを表示し、完了後に待機
            const message = `${currentPlayer.name}の行動を選択してください`;
            // console.log('メッセージ表示:', message); // DEBUG
            await this.showMessageAndWait(message);
            // console.log('メッセージ表示完了'); // DEBUG
            
            // UI更新: 現在選択中のプレイヤーを通知
            if (this.uiUpdateCallback) {
                // console.log('UI更新コールバック実行'); // DEBUG
                this.uiUpdateCallback('player_selection', {
                    currentPlayer: currentPlayer,
                    canCancel: this.currentPlayerIndex > 0
                });
            } else {
                // console.log('UI更新コールバックが設定されていない'); // DEBUG
            }
        }
        
        // console.log('selectNextPlayerAction完了'); // DEBUG
    }

    /**
     * 指定されたキャラクターの行動を設定する
     * @param {Object} actor - アクター
     * @param {string} actionType - 行動種別 ('fight', 'defend', 'magic', 'item')
     * @param {Object} target - ターゲット
     * @param {Object} params - その他のパラメーター (itemId, spellId等)
     */
    async setPlayerAction(actor, actionType, target, params = {}) {
        const action = {
            actor: actor,
            type: actionType,
            target: target,
            params: params
        };

        this.playerActions[this.currentPlayerIndex] = action;
        this.actionHistory.push(action);
        
        this.currentPlayerIndex++;
        await this.selectNextPlayerAction();
    }

    /**
     * 前の行動選択に戻る（Escキーでのキャンセル）
     */
    async cancelLastAction() {
        if (this.currentPlayerIndex <= 0 || this.phase !== 'player_selection') {
            return false; // 最初のプレイヤーはキャンセルできない
        }

        this.currentPlayerIndex--;
        this.playerActions.pop();
        this.actionHistory.pop();
        
        await this.selectNextPlayerAction();
        return true;
    }

    /**
     * ターン実行を開始する
     */
    executeTurn() {
        this.setPhase('turn_execution');
        this.generateTurnOrder();
        this.currentTurnIndex = 0;
        this.executeNextAction();
    }

    /**
     * 行動順を生成する（agility + 乱数0-9）
     */
    generateTurnOrder() {
        const allActions = [];
        
        // プレイヤーアクション
        this.playerActions.forEach(action => {
            if (action && action.actor.isAlive()) {
                const speed = action.actor.agility + Math.floor(Math.random() * 10);
                allActions.push({
                    ...action,
                    speed: speed
                });
            }
        });

        // 敵のアクション（AI）
        this.enemyParty.forEach(enemy => {
            if (enemy.isAlive()) {
                const action = enemy.generateAction(this.playerParty);
                const speed = enemy.agility + Math.floor(Math.random() * 10);
                allActions.push({
                    ...action,
                    speed: speed
                });
            }
        });

        // 速度順でソート（降順）
        this.turnOrder = allActions.sort((a, b) => b.speed - a.speed);
    }


    /**
     * 次の行動を実行する
     */
    executeNextAction() {
        if (this.currentTurnIndex >= this.turnOrder.length) {
            // 全員の行動が完了、次のターンへ
            this.startPlayerActionSelection();
            return;
        }

        const currentAction = this.turnOrder[this.currentTurnIndex];
        this.executeAction(currentAction);
    }

    /**
     * 行動を実行する
     * @param {Object} action - 実行する行動
     */
    executeAction(action) {
        if (!action.actor.isAlive()) {
            this.currentTurnIndex++;
            this.executeNextAction();
            return;
        }

        switch (action.type) {
            case 'fight':
                this.executeFightAction(action);
                break;
            case 'defend':
                this.executeDefendAction(action);
                break;
            case 'magic':
                this.executeMagicAction(action);
                break;
            case 'item':
                this.executeItemAction(action);
                break;
            case 'enemy_action':
                this.executeEnemyAction(action);
                break;
            default:
                console.warn(`不明な行動タイプ: ${action.type}`);
                this.currentTurnIndex++;
                this.executeNextAction();
                break;
        }
    }

    /**
     * 攻撃アクションを実行する
     * @param {Object} action - 攻撃行動
     */
    executeFightAction(action) {
        // ActionResolverを使用して攻撃を解決
        const result = this.actionResolver.resolveAction(action);
        
        if (result.success) {
            // MessageManagerを使ってメッセージを構築
            const message = this.messageManager.buildAttackMessage(
                result, 
                action.actor.name, 
                action.target.name
            );
            this.showMessageAndWait(message);
        } else {
            this.showMessageAndWait(result.message || this.messageManager.buildErrorMessage('action_failed', { actor: action.actor, actionName: '攻撃' }));
        }

        setTimeout(() => {
            const battleResult = this.checkBattleResult();
            if (battleResult) {
                this.endBattle(battleResult);
            } else {
                this.currentTurnIndex++;
                this.executeNextAction();
            }
        }, 2000);
    }

    /**
     * 防御アクションを実行する
     * @param {Object} action - 防御行動
     */
    executeDefendAction(action) {
        // MessageManagerで防御メッセージを構築  
        const defendMessage = this.messageManager.buildMessage({
            success: true,
            effects: [{ type: 'defend', target: action.actor }]
        });
        this.showMessageAndWait(defendMessage);
        
        setTimeout(() => {
            this.currentTurnIndex++;
            this.executeNextAction();
        }, 1500);
    }

    /**
     * 魔法アクションを実行する
     * @param {Object} action - 魔法行動
     */
    executeMagicAction(action) {
        // 簡単な実装: 回復魔法
        if (action.params.spellId && action.params.spellId.includes('回復')) {
            const healAmount = Math.floor(Math.random() * 30) + 20; // 20-49の回復
            action.target.currentHp = Math.min(action.target.maxHp, action.target.currentHp + healAmount);
            action.actor.currentMp = Math.max(0, action.actor.currentMp - 5);
            
            // MessageManagerで統一的にメッセージを構築
            const healMessage = this.messageManager.buildMagicMessage({
                success: true,
                effects: [{ type: 'heal', amount: healAmount, target: action.target }]
            }, action.actor.name, action.params.spellId);
            this.showMessageAndWait(healMessage);
        } else {
            // MPが足りない場合のメッセージ
            const failMessage = this.messageManager.buildErrorMessage('mp_insufficient', { 
                caster: action.actor 
            });
            this.showMessageAndWait(failMessage);
        }
        
        setTimeout(() => {
            this.currentTurnIndex++;
            this.executeNextAction();
        }, 2000);
    }

    /**
     * アイテムアクションを実行する
     * @param {Object} action - アイテム使用行動
     */
    executeItemAction(action) {
        // アイテムIDからアイテムデータを取得
        const itemData = this.inventories[action.params.itemId];
        const itemName = itemData ? itemData.name : action.params.itemId;
        
        // MessageManagerでアイテム使用メッセージを構築
        const itemMessage = this.messageManager.buildItemMessage({
            success: true,
            effects: []
        }, action.actor.name, itemName, itemData);
        this.showMessageAndWait(itemMessage);
        
        setTimeout(() => {
            this.currentTurnIndex++;
            this.executeNextAction();
        }, 2000);
    }
    
    /**
     * 敵のアクション（enemy_action）を実行する（統一処理版）
     * @param {Object} action - 敵のアクション
     */
    executeEnemyAction(action) {
        // ActionResolverを使用してアクションを解決
        const result = this.actionResolver.resolveAction(action);
        
        if (result.success) {
            // MessageManagerを使ってメッセージを構築
            const message = this.messageManager.buildEnemyActionMessage(
                result,
                action.actor.name,
                result.actionData?.action?.name || 'アクション'
            );
            this.showMessageAndWait(message);
        } else {
            console.warn("アクション失敗", result);
            this.showMessageAndWait(this.messageManager.buildErrorMessage('action_failed', { actor: action.actor, actionName: 'アクション' }));
        }
        
        // 勝敗判定
        const battleResult = this.checkBattleResult();
        if (battleResult) {
            this.endBattle(battleResult);
            return;
        }
        
        setTimeout(() => {
            this.currentTurnIndex++;
            this.executeNextAction();
        }, 2000);
    }


    /**
     * 敵のターンを実行する（先攻時）
     */
    executeEnemyTurn() {
        this.generateEnemyTurnOrder();
        this.executeEnemyActions();
    }

    /**
     * 敵の行動順を生成する
     */
    generateEnemyTurnOrder() {
        this.turnOrder = this.enemyParty
            .filter(enemy => enemy.isAlive())
            .map(enemy => {
                const action = enemy.generateAction(this.playerParty);
                const speed = enemy.agility + Math.floor(Math.random() * 10);
                return {
                    ...action,
                    speed: speed
                };
            })
            .sort((a, b) => b.speed - a.speed);
    }

    /**
     * 敵のアクションを順次実行する
     */
    executeEnemyActions() {
        if (this.turnOrder.length === 0) {
            // 敵のターン終了、プレイヤーターンへ
            this.startPlayerActionSelection();
            return;
        }

        const action = this.turnOrder.shift();
        this.executeAction(action);
    }

    /**
     * 勝敗判定を行う
     * @returns {string|null} 'victory', 'defeat', または null
     */
    checkBattleResult() {
        const aliveEnemies = this.enemyParty.filter(e => e.isAlive());
        const alivePlayers = this.playerParty.filter(p => p.isAlive());

        if (aliveEnemies.length === 0) {
            return 'victory';
        } else if (alivePlayers.length === 0) {
            return 'defeat';
        }
        
        return null;
    }

    /**
     * バトルを終了する
     * @param {string} result - 'victory' or 'defeat'
     */
    endBattle(result) {
        this.setPhase('battle_end');
        
        // MessageManagerでバトル結果メッセージを構築
        const resultMessage = this.messageManager.buildBattleStatusMessage('battle_end', {
            victory: result === 'victory'
        });
        this.showMessageAndWait(resultMessage);

        // UI更新: 再プレイボタンを表示
        if (this.uiUpdateCallback) {
            this.uiUpdateCallback('battle_end', { result: result });
        }
    }

    /**
     * バトルをリスタートする
     */
    async restartBattle() {
        this.initializeBattle();
        await this.startBattle();
    }

    /**
     * メッセージを表示する（タイプライター処理完了またはスキップで即座に終了）
     * @param {string} message - 表示メッセージ
     * @returns {Promise} メッセージ表示完了を示すPromise
     */
    async showMessage(message) {
        if (this.messageCallback) {
            // MessageDisplayにメッセージを送信し、そのPromiseを取得
            const messageDisplay = document.querySelector('message-display');
            if (messageDisplay) {
                // MessageDisplayのaddMessageは内部でタイプライター効果とスキップ機能を処理
                await messageDisplay.addMessage(message);
            } else {
                // MessageDisplayが見つからない場合はフォールバック
                this.messageCallback(message);
            }
        }
    }

    /**
     * メッセージを表示し、完了後に待機する
     * @param {string} message - 表示メッセージ
     * @param {number} waitTime - 待機時間（ミリ秒、デフォルトは定数値）
     * @returns {Promise} 全処理完了を示すPromise
     */
    async showMessageAndWait(message, waitTime = TurnBasedBattleRule.MESSAGE_COMPLETION_WAIT_TIME) {
        await this.showMessage(message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    /**
     * 生存している指定インデックスのプレイヤーを取得
     * @param {number} index - インデックス
     * @returns {Object|null} プレイヤーオブジェクト
     */
    getAlivePlayerByIndex(index) {
        const alivePlayers = this.playerParty.filter(p => p.isAlive());
        return alivePlayers[index] || null;
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnBasedBattleRule;
} else {
    window.TurnBasedBattleRule = TurnBasedBattleRule;
}