/**
 * 敵キャラクタークラス
 * Actorクラスを継承し、敵特有の行動ロジックを提供する
 */
class Enemy extends Actor {
    constructor(actorData, actorsDatabase, inventoriesDatabase, commandsDatabase) {
        super(actorData, actorsDatabase, inventoriesDatabase);
        this.commandsDatabase = commandsDatabase;
    }

    /**
     * 敵の利用可能なアクションを取得する
     * @returns {Array} 利用可能なアクション配列
     */
    getAvailableActions() {
        if (!this.inventoryItems) {
            return [];
        }
        
        return this.inventoryItems.filter(inventory => {
            const itemData = this.inventories[inventory.inventory_id];
            // action, item, magic, weaponタイプのものを対象とする
            return itemData && ['action', 'item', 'magic', 'weapon'].includes(itemData.type);
        });
    }

    /**
     * ランダムに行動を生成する
     * @param {Array} playerParty - プレイヤーパーティ
     * @returns {Object} 行動オブジェクト
     */
    generateAction(playerParty) {
        const availableActions = this.getAvailableActions();
        
        if (availableActions.length === 0) {
            // アクションが無い場合は基本攻撃
            const alivePlayers = playerParty.filter(p => this.isActorAlive(p));
            const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
            
            return {
                actor: this,
                type: 'fight',
                target: target,
                params: {}
            };
        }
        
        // ランダムにアクションを選択
        const selectedAction = availableActions[Math.floor(Math.random() * availableActions.length)];
        
        // 行動タイプを判定してactionオブジェクトを構築
        return this.buildActionFromInventory(selectedAction, playerParty);
    }

    /**
     * inventoryアイテムから行動オブジェクトを構築する
     * マスターデータのコマンドで統一的に処理
     * @param {Object} inventoryItem - 選択されたinventoryアイテム
     * @param {Array} playerParty - プレイヤーパーティ
     * @returns {Object} 行動オブジェクト
     */
    buildActionFromInventory(inventoryItem, playerParty) {
        // 全てのアクションを統一的に処理
        // ターゲット設定やダメージ適用はCommandEvaluatorが担当
        return {
            actor: this,
            type: 'enemy_action',
            actionId: inventoryItem.inventory_id,
            target: null, // CommandEvaluatorで設定される
            params: {
                playerParty: playerParty // ランダムターゲット選択用
            }
        };
    }

}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Enemy;
} else {
    window.Enemy = Enemy;
}