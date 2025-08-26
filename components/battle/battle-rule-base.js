/**
 * バトルルール基底クラス
 * 各種バトルシステムの共通インターフェースを定義する
 */
class BattleRuleBase {
    constructor(actors, inventories, playerParty, enemyParty) {
        this.actors = actors;
        this.inventories = inventories;
        this.playerParty = playerParty;
        this.enemyParty = enemyParty;
        this.battleState = null;
        this.messageCallback = null;
        this.uiUpdateCallback = null;
    }

    /**
     * バトル開始時の初期化処理（抽象メソッド）
     */
    initializeBattle() {
        throw new Error('initializeBattle method must be implemented');
    }

    /**
     * バトルを開始する（抽象メソッド）
     */
    startBattle() {
        throw new Error('startBattle method must be implemented');
    }

    /**
     * ユーザー行動選択を開始する（抽象メソッド）
     */
    startPlayerActionSelection() {
        throw new Error('startPlayerActionSelection method must be implemented');
    }

    /**
     * 指定されたキャラクターの行動を設定する（抽象メソッド）
     * @param {Object} actor - アクター
     * @param {string} actionType - 行動種別
     * @param {Object} target - ターゲット
     * @param {Object} params - その他のパラメーター
     */
    setPlayerAction(actor, actionType, target, params) {
        throw new Error('setPlayerAction method must be implemented');
    }

    /**
     * ターン実行を開始する（抽象メソッド）
     */
    executeTurn() {
        throw new Error('executeTurn method must be implemented');
    }

    /**
     * 勝敗判定を行う（抽象メソッド）
     * @returns {string|null} 'victory', 'defeat', または null
     */
    checkBattleResult() {
        throw new Error('checkBattleResult method must be implemented');
    }

    /**
     * バトルを終了する（抽象メソッド）
     * @param {string} result - 'victory' or 'defeat'
     */
    endBattle(result) {
        throw new Error('endBattle method must be implemented');
    }

    /**
     * メッセージコールバックを設定する
     * @param {Function} callback - メッセージ表示用コールバック
     */
    setMessageCallback(callback) {
        this.messageCallback = callback;
    }

    /**
     * UI更新コールバックを設定する
     * @param {Function} callback - UI更新用コールバック
     */
    setUIUpdateCallback(callback) {
        this.uiUpdateCallback = callback;
    }

    /**
     * アクターのHP/MPを初期化する
     * @param {Object} actor - アクター
     */
    initializeActorStats(actor) {
        const actorData = this.actors[actor.actor_id];
        if (actorData) {
            actor.maxHp = actorData.hp;
            actor.currentHp = actorData.hp;
            actor.maxMp = actorData.mp;
            actor.currentMp = actorData.mp;
            actor.agility = actorData.agility || 10;
        }
    }

    /**
     * パーティ全体のHP/MPを初期化する
     */
    initializeAllStats() {
        [...this.playerParty, ...this.enemyParty].forEach(actor => {
            this.initializeActorStats(actor);
        });
    }

    /**
     * アクターが行動可能かどうかを判定する
     * @param {Object} actor - アクター
     * @returns {boolean} 行動可能かどうか
     */
    isActorAlive(actor) {
        return actor.currentHp > 0;
    }

    /**
     * パーティ全体が全滅しているかを判定する
     * @param {Array} party - パーティ
     * @returns {boolean} 全滅しているかどうか
     */
    isPartyDefeated(party) {
        return party.every(actor => !this.isActorAlive(actor));
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleRuleBase;
} else {
    window.BattleRuleBase = BattleRuleBase;
}