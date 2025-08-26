/**
 * バトル状態管理クラス
 * バトルの状態変更と監視を管理する
 */
class BattleStateManager {
    constructor() {
        this.state = {
            phase: 'initial', // 'initial', 'player_selection', 'turn_execution', 'battle_end'
            currentPlayer: null,
            selectedActions: [],
            turnOrder: [],
            currentTurn: 0,
            battleResult: null
        };
        
        this.stateChangeListeners = [];
        this.history = [];
    }

    /**
     * 状態変更リスナーを追加する
     * @param {Function} listener - 状態変更時に呼ばれるコールバック
     */
    addStateChangeListener(listener) {
        this.stateChangeListeners.push(listener);
    }

    /**
     * 状態変更リスナーを削除する
     * @param {Function} listener - 削除するリスナー
     */
    removeStateChangeListener(listener) {
        const index = this.stateChangeListeners.indexOf(listener);
        if (index > -1) {
            this.stateChangeListeners.splice(index, 1);
        }
    }

    /**
     * 状態を更新する
     * @param {Object} newState - 新しい状態の部分オブジェクト
     */
    updateState(newState) {
        const previousState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // 履歴に保存
        this.history.push({
            timestamp: Date.now(),
            previousState: previousState,
            newState: { ...this.state },
            changes: newState
        });

        // リスナーに通知
        this.notifyStateChange(previousState, this.state, newState);
    }

    /**
     * 現在の状態を取得する
     * @returns {Object} 現在の状態
     */
    getState() {
        return { ...this.state };
    }

    /**
     * 特定の状態プロパティを取得する
     * @param {string} key - 取得するプロパティキー
     * @returns {*} プロパティの値
     */
    getStateProperty(key) {
        return this.state[key];
    }

    /**
     * フェーズを変更する
     * @param {string} newPhase - 新しいフェーズ
     */
    setPhase(newPhase) {
        this.updateState({ phase: newPhase });
    }

    /**
     * 現在のプレイヤーを設定する
     * @param {Object} player - 現在のプレイヤー
     */
    setCurrentPlayer(player) {
        this.updateState({ currentPlayer: player });
    }

    /**
     * プレイヤー行動を追加する
     * @param {Object} action - 行動オブジェクト
     */
    addPlayerAction(action) {
        const updatedActions = [...this.state.selectedActions, action];
        this.updateState({ selectedActions: updatedActions });
    }

    /**
     * 最後のプレイヤー行動を削除する（キャンセル）
     */
    removeLastPlayerAction() {
        if (this.state.selectedActions.length > 0) {
            const updatedActions = this.state.selectedActions.slice(0, -1);
            this.updateState({ selectedActions: updatedActions });
            return true;
        }
        return false;
    }

    /**
     * プレイヤー行動をクリアする
     */
    clearPlayerActions() {
        this.updateState({ selectedActions: [] });
    }

    /**
     * ターン順を設定する
     * @param {Array} turnOrder - ターン順配列
     */
    setTurnOrder(turnOrder) {
        this.updateState({ turnOrder: turnOrder, currentTurn: 0 });
    }

    /**
     * 次のターンに進む
     */
    nextTurn() {
        const newTurn = this.state.currentTurn + 1;
        this.updateState({ currentTurn: newTurn });
    }

    /**
     * バトル結果を設定する
     * @param {string} result - 'victory', 'defeat', または null
     */
    setBattleResult(result) {
        this.updateState({ battleResult: result });
    }

    /**
     * 状態をリセットする
     */
    reset() {
        const initialState = {
            phase: 'initial',
            currentPlayer: null,
            selectedActions: [],
            turnOrder: [],
            currentTurn: 0,
            battleResult: null
        };
        
        this.state = initialState;
        this.history = [];
        
        // リスナーに通知
        this.notifyStateChange({}, initialState, initialState);
    }

    /**
     * 状態変更をリスナーに通知する
     * @param {Object} previousState - 前の状態
     * @param {Object} currentState - 現在の状態
     * @param {Object} changes - 変更内容
     */
    notifyStateChange(previousState, currentState, changes) {
        this.stateChangeListeners.forEach(listener => {
            try {
                listener(previousState, currentState, changes);
            } catch (error) {
                console.error('State change listener error:', error);
            }
        });
    }

    /**
     * 状態履歴を取得する
     * @param {number} limit - 取得する履歴の数（デフォルト: 10）
     * @returns {Array} 状態履歴配列
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    /**
     * 前の状態に戻す（アンドゥ機能）
     * @returns {boolean} 戻せたかどうか
     */
    undo() {
        if (this.history.length === 0) {
            return false;
        }

        const lastEntry = this.history.pop();
        this.state = { ...lastEntry.previousState };
        
        // リスナーに通知（アンドゥとして）
        this.notifyStateChange(lastEntry.newState, this.state, { undo: true });
        
        return true;
    }

    /**
     * 現在の状態が指定された条件を満たすかチェックする
     * @param {Object} conditions - チェック条件
     * @returns {boolean} 条件を満たすかどうか
     */
    checkConditions(conditions) {
        for (const [key, expectedValue] of Object.entries(conditions)) {
            if (this.state[key] !== expectedValue) {
                return false;
            }
        }
        return true;
    }

    /**
     * デバッグ用：現在の状態を文字列として出力
     * @returns {string} 状態の文字列表現
     */
    toString() {
        return JSON.stringify(this.state, null, 2);
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleStateManager;
} else {
    window.BattleStateManager = BattleStateManager;
}