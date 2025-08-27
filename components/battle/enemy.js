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
     * @param {Object} inventoryItem - 選択されたinventoryアイテム
     * @param {Array} playerParty - プレイヤーパーティ
     * @returns {Object} 行動オブジェクト
     */
    buildActionFromInventory(inventoryItem, playerParty) {
        const itemData = this.inventories[inventoryItem.inventory_id];
        const alivePlayers = playerParty.filter(p => this.isActorAlive(p));
        
        switch (itemData.type) {
            case 'action':
                // アクションを詳しく解析（攻撃マクロを含むかチェック）
                if (this.isAttackAction(itemData)) {
                    // 攻撃マクロを含むアクション
                    const attackTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                    return {
                        actor: this,
                        type: 'enemy_attack_action',
                        actionId: inventoryItem.inventory_id,
                        target: attackTarget,
                        params: {}
                    };
                } else {
                    // 通常のアクション（様子を見ているなど）
                    return {
                        actor: this,
                        type: 'enemy_action',
                        actionId: inventoryItem.inventory_id,
                        target: null, // アクションはターゲット不要
                        params: {}
                    };
                }
                
            case 'magic':
                // 魔法
                const magicTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                return {
                    actor: this,
                    type: 'magic',
                    actionId: inventoryItem.inventory_id,
                    target: magicTarget,
                    params: {}
                };
                
            case 'item':
                // アイテム（回復など）
                const itemTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                return {
                    actor: this,
                    type: 'item',
                    actionId: inventoryItem.inventory_id,
                    target: itemTarget,
                    params: {}
                };
                
            case 'weapon':
            default:
                // 武器攻撃、または不明なタイプは基本攻撃扱い
                const fightTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                return {
                    actor: this,
                    type: 'fight',
                    target: fightTarget,
                    params: {}
                };
        }
    }

    /**
     * アクションが攻撃マクロを含むかを判定する
     * @param {Object} actionData - アクションデータ
     * @returns {boolean} 攻撃マクロを含むかどうか
     */
    isAttackAction(actionData) {
        if (!actionData.commands || actionData.commands.length === 0) {
            return false;
        }
        
        // コマンドに「単純攻撃マクロ」や「攻撃点ルール適用」が含まれているかチェック
        return actionData.commands.some(command => {
            const commandData = this.inventories[command.command_id] || 
                               (this.commandsDatabase ? this.commandsDatabase[command.command_id] : null);
            
            return commandData && (
                command.command_id === '1c189a49-f917-41b3-9d31-445f88c17c89' || // 単純攻撃マクロ
                command.command_id === '34e0a3a6-641a-4602-9f93-3eadfcaa5df8'    // 攻撃点ルール適用
            );
        });
    }

    /**
     * アクターが生存しているかチェック（プライベートヘルパー）
     * @param {Object} actor - アクター
     * @returns {boolean} 生存しているかどうか
     */
    isActorAlive(actor) {
        return actor && actor.isAlive && actor.isAlive();
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Enemy;
} else {
    window.Enemy = Enemy;
}