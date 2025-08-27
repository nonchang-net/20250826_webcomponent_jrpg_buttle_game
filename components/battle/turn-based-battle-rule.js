/**
 * ターン制バトルルール実装クラス
 * battle_rule_1.mdで定義されたターン制バトルシステムを実装する
 */
class TurnBasedBattleRule extends BattleRuleBase {
    constructor(actors, inventories, messages, locale, playerParty, enemyParty, actionResolver) {
        super(actors, inventories, messages, locale, playerParty, enemyParty, actionResolver);
        
        // バトル状態管理
        this.phase = 'initial'; // 'initial', 'player_selection', 'turn_execution', 'battle_end'
        this.currentPlayerIndex = 0;
        this.playerActions = [];
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        
        // 行動キャンセル履歴
        this.actionHistory = [];
    }

    /**
     * バトル開始時の初期化処理
     */
    initializeBattle() {
        // HP/MPを初期化
        this.initializeAllStats();
        
        // バトル開始
        this.phase = 'initial';
    }

    /**
     * バトルを開始する
     */
    startBattle() {
        // ランダムで先攻後攻を決定
        const isEnemyFirst = Math.random() < 0.5;
        
        if (isEnemyFirst) {
            // 1a: 敵先攻
            this.showMessage('魔物の群れが現れた！ 魔物の群れは、こちらが身構える前に襲いかかってきた！');
            setTimeout(() => {
                this.executeEnemyTurn();
            }, 2000);
        } else {
            // 1b: プレイヤー先攻
            this.showMessage('魔物の群れが現れた！ コマンド？');
            setTimeout(() => {
                this.startPlayerActionSelection();
            }, 2000);
        }
    }

    /**
     * ユーザー行動選択を開始する
     */
    startPlayerActionSelection() {
        this.phase = 'player_selection';
        this.currentPlayerIndex = 0;
        this.playerActions = [];
        this.selectNextPlayerAction();
    }

    /**
     * 次のプレイヤーの行動選択を促す
     */
    selectNextPlayerAction() {
        const alivePlayersCount = this.playerParty.filter(p => p.isAlive()).length;
        
        if (this.currentPlayerIndex >= alivePlayersCount) {
            // 全員の行動が決定したので、ターン実行へ
            this.executeTurn();
            return;
        }

        const currentPlayer = this.getAlivePlayerByIndex(this.currentPlayerIndex);
        if (currentPlayer) {
            this.showMessage(`${currentPlayer.name}の行動を選択してください`);
            
            // UI更新: 現在選択中のプレイヤーを通知
            if (this.uiUpdateCallback) {
                this.uiUpdateCallback('player_selection', {
                    currentPlayer: currentPlayer,
                    canCancel: this.currentPlayerIndex > 0
                });
            }
        }
    }

    /**
     * 指定されたキャラクターの行動を設定する
     * @param {Object} actor - アクター
     * @param {string} actionType - 行動種別 ('fight', 'defend', 'magic', 'item')
     * @param {Object} target - ターゲット
     * @param {Object} params - その他のパラメーター (itemId, spellId等)
     */
    setPlayerAction(actor, actionType, target, params = {}) {
        const action = {
            actor: actor,
            type: actionType,
            target: target,
            params: params
        };

        this.playerActions[this.currentPlayerIndex] = action;
        this.actionHistory.push(action);
        
        this.currentPlayerIndex++;
        this.selectNextPlayerAction();
    }

    /**
     * 前の行動選択に戻る（Escキーでのキャンセル）
     */
    cancelLastAction() {
        if (this.currentPlayerIndex <= 0 || this.phase !== 'player_selection') {
            return false; // 最初のプレイヤーはキャンセルできない
        }

        this.currentPlayerIndex--;
        this.playerActions.pop();
        this.actionHistory.pop();
        
        this.selectNextPlayerAction();
        return true;
    }

    /**
     * ターン実行を開始する
     */
    executeTurn() {
        this.phase = 'turn_execution';
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
            this.showMessage(result.message);
        } else {
            this.showMessage(result.message || `${action.actor.name}の攻撃が失敗しました`);
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
        this.showMessage(`${action.actor.name}は身を守っている！`);
        
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
            
            this.showMessage(`${action.actor.name}は${action.params.spellId}を唱えた！${action.target.name}のHPが${healAmount}回復した！`);
        } else {
            this.showMessage(`${action.actor.name}は呪文を唱えた！`);
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
        this.showMessage(`${action.actor.name}は${action.params.itemId}を使った！`);
        
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
            this.showMessage(result.message);
            
            // ダメージや効果を適用
            if (result.effects && result.effects.length > 0) {
                result.effects.forEach(effect => {
                    if (effect.type === 'damage' && effect.target) {
                        this.showMessage(`${effect.target.name}に${effect.amount}のダメージ！`);
                    }
                });
            }
        } else {
            console.warn("アクション失敗", result);
            this.showMessage(`${action.actor.name}のアクションに失敗した！`);
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
        this.phase = 'battle_end';
        
        if (result === 'victory') {
            this.showMessage('勝利しました！');
        } else {
            this.showMessage('全滅しました...');
        }

        // UI更新: 再プレイボタンを表示
        if (this.uiUpdateCallback) {
            this.uiUpdateCallback('battle_end', { result: result });
        }
    }

    /**
     * バトルをリスタートする
     */
    restartBattle() {
        this.initializeBattle();
        this.startBattle();
    }

    /**
     * メッセージを表示する
     * @param {string} message - 表示メッセージ
     */
    showMessage(message) {
        if (this.messageCallback) {
            this.messageCallback(message);
        }
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