/**
 * アクタークラス
 * 一人のキャラクター（プレイヤー・敵）を表現し、能力値計算や状態管理を行う
 */
class Actor {
    constructor(actorData, actorsDatabase, inventoriesDatabase) {
        this.id = actorData.id;
        this.actorData = actorData;
        this.actors = actorsDatabase;
        this.inventories = inventoriesDatabase;
        
        // 基本ステータス
        this.name = actorData.name;
        this.isEnemy = actorData.is_enemy === "TRUE";
        this.maxHp = parseInt(actorData.hp) || 0;
        this.maxMp = parseInt(actorData.mp) || 0;
        this.currentHp = this.maxHp;
        this.currentMp = this.maxMp;
        this.agility = parseInt(actorData.agility) || 0;
        
        // 戦闘状態
        this.defendingUntilNextTurn = false;
        this.statusEffects = []; // バフ・デバフ状態（将来実装）
        
        // インベントリ
        this.inventoryItems = actorData.inventories || [];
        
        // 装備情報を構築
        this.equipments = this.buildEquipments();
    }

    /**
     * アクターが生存しているかチェック
     * @returns {boolean} 生存しているかどうか
     */
    isAlive() {
        return this.currentHp > 0;
    }

    /**
     * 基本攻撃力を取得する
     * @returns {number} 基本攻撃力
     */
    getBaseAttack() {
        return parseInt(this.actorData.attack) || 0;
    }

    /**
     * 防御力を取得する
     * @returns {number} 防御力
     */
    getDefence() {
        return parseInt(this.actorData.defence) || 0;
    }

    /**
     * 装備武器の攻撃力を取得する
     * @returns {number} 武器攻撃力
     */
    getEquippedWeaponAttack() {
        // 装備中の武器を探す
        const equippedWeapon = this.inventoryItems.find(inv => inv.equipped === "TRUE");
        if (!equippedWeapon) {
            return 0; // 武器を装備していない（僧侶など）
        }

        // inventoriesマスターから武器データを取得
        const weaponData = this.inventories[equippedWeapon.inventory_id];
        if (!weaponData || weaponData.type !== 'weapon') {
            return 0;
        }

        // 単純攻撃マクロ（command_id=1c189a49-f917-41b3-9d31-445f88c17c89）のarg1を取得
        const attackCommand = weaponData.commands.find(cmd => 
            cmd.command_id === "1c189a49-f917-41b3-9d31-445f88c17c89"
        );

        return attackCommand ? parseInt(attackCommand.arg1) || 0 : 0;
    }

    /**
     * 攻撃力合計を計算する
     * @returns {number} 攻撃力合計
     */
    getTotalAttackPower() {
        return this.getBaseAttack() + this.getEquippedWeaponAttack();
    }

    /**
     * ダメージを受ける
     * @param {number} damage - 受けるダメージ量
     * @returns {number} 実際に受けたダメージ
     */
    takeDamage(damage) {
        const previousHp = this.currentHp;
        this.currentHp = Math.max(0, this.currentHp - damage);
        return previousHp - this.currentHp;
    }

    /**
     * 回復する
     * @param {number} healAmount - 回復量
     * @returns {number} 実際に回復した量
     */
    heal(healAmount) {
        const previousHp = this.currentHp;
        this.currentHp = Math.min(this.maxHp, this.currentHp + healAmount);
        return this.currentHp - previousHp;
    }

    /**
     * MPを消費する
     * @param {number} mpCost - 消費MP
     * @returns {boolean} 消費できたかどうか
     */
    consumeMp(mpCost) {
        if (this.currentMp >= mpCost) {
            this.currentMp -= mpCost;
            return true;
        }
        return false;
    }

    /**
     * 防御状態を設定する
     * @param {boolean} defending - 防御状態
     */
    setDefending(defending = true) {
        this.defendingUntilNextTurn = defending;
    }

    /**
     * 防御状態かどうかをチェック
     * @returns {boolean} 防御状態かどうか
     */
    isDefending() {
        return this.defendingUntilNextTurn;
    }

    /**
     * ステータス効果を追加する（将来実装用）
     * @param {string} effect - 効果名
     * @param {number} duration - 持続ターン数
     */
    addStatusEffect(effect, duration = 3) {
        // 将来実装: 毒、麻痺、混乱などの状態異常管理
        const existingEffect = this.statusEffects.find(se => se.name === effect);
        if (existingEffect) {
            existingEffect.duration = Math.max(existingEffect.duration, duration);
        } else {
            this.statusEffects.push({ name: effect, duration: duration });
        }
    }

    /**
     * ステータス効果を削除する（将来実装用）
     * @param {string} effect - 効果名
     */
    removeStatusEffect(effect) {
        const index = this.statusEffects.findIndex(se => se.name === effect);
        if (index > -1) {
            this.statusEffects.splice(index, 1);
        }
    }

    /**
     * ターン終了時の処理
     */
    endTurn() {
        // 防御状態をリセット
        this.defendingUntilNextTurn = false;
        
        // ステータス効果の持続時間を減少（将来実装）
        this.statusEffects.forEach(effect => {
            effect.duration--;
        });
        this.statusEffects = this.statusEffects.filter(effect => effect.duration > 0);
    }

    /**
     * アクターの現在状態を取得する
     * @returns {Object} 現在状態
     */
    getStatus() {
        return {
            id: this.id,
            name: this.name,
            isEnemy: this.isEnemy,
            currentHp: this.currentHp,
            maxHp: this.maxHp,
            currentMp: this.currentMp,
            maxMp: this.maxMp,
            isAlive: this.isAlive(),
            isDefending: this.isDefending(),
            statusEffects: [...this.statusEffects],
            totalAttackPower: this.getTotalAttackPower(),
            defence: this.getDefence()
        };
    }

    /**
     * 装備情報を構築する
     * @returns {Object} 装備情報
     */
    buildEquipments() {
        const equipments = {
            weapon: null,
            armor: null,
            accessory: null
        };

        for (const item of this.inventoryItems) {
            if (item.equipped === "TRUE") {
                const itemData = this.inventories[item.inventory_id];
                if (itemData) {
                    switch (itemData.type) {
                        case 'weapon':
                            equipments.weapon = item.inventory_id;
                            break;
                        case 'armor':
                            equipments.armor = item.inventory_id;
                            break;
                        case 'accessory':
                            equipments.accessory = item.inventory_id;
                            break;
                    }
                }
            }
        }

        return equipments;
    }

    /**
     * デバッグ用：アクター情報を文字列として出力
     * @returns {string} アクター情報
     */
    toString() {
        return `${this.name}(${this.currentHp}/${this.maxHp}HP, 攻撃力:${this.getTotalAttackPower()}, 防御力:${this.getDefence()})`;
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Actor;
} else {
    window.Actor = Actor;
}