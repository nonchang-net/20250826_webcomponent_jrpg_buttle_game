/**
 * 行動実行クラス
 * 各種行動（攻撃、防御、魔法、アイテム）の実行と結果を管理する
 */
class ActionResolver {
    constructor(actors, inventories) {
        this.actors = actors;
        this.inventories = inventories;
        this.damageCalculator = new DamageCalculator(actors, inventories);
    }

    /**
     * 行動を実行する
     * @param {Object} action - 実行する行動
     * @returns {Object} 実行結果
     */
    resolveAction(action) {
        if (!this.isActorAlive(action.actor)) {
            return {
                success: false,
                message: `${action.actor.name}は行動不能です。`,
                effects: []
            };
        }

        switch (action.type) {
            case 'fight':
                return this.resolveFightAction(action);
            case 'defend':
                return this.resolveDefendAction(action);
            case 'magic':
                return this.resolveMagicAction(action);
            case 'item':
                return this.resolveItemAction(action);
            default:
                return {
                    success: false,
                    message: `不明な行動: ${action.type}`,
                    effects: []
                };
        }
    }

    /**
     * 攻撃行動を実行する
     * @param {Object} action - 攻撃行動
     * @returns {Object} 実行結果
     */
    resolveFightAction(action) {
        const attacker = action.actor;
        const target = action.target;

        if (!this.isActorAlive(target)) {
            return {
                success: false,
                message: `${attacker.name}の攻撃！しかし${target.name}はすでに倒れている！`,
                effects: []
            };
        }

        // ダメージ計算
        const damage = this.damageCalculator.calculatePhysicalDamage(attacker, target);
        
        // ダメージ適用
        const previousHp = target.currentHp;
        target.currentHp = Math.max(0, target.currentHp - damage);
        const actualDamage = previousHp - target.currentHp;

        const effects = [
            {
                type: 'damage',
                target: target,
                amount: actualDamage,
                previousHp: previousHp,
                newHp: target.currentHp
            }
        ];

        let message = `${attacker.name}の攻撃！${target.name}に${actualDamage}のダメージ！`;
        
        if (target.currentHp <= 0) {
            message += `\n${target.name}は倒れた！`;
            effects.push({
                type: 'defeat',
                target: target
            });
        }

        return {
            success: true,
            message: message,
            effects: effects
        };
    }

    /**
     * 防御行動を実行する
     * @param {Object} action - 防御行動
     * @returns {Object} 実行結果
     */
    resolveDefendAction(action) {
        const defender = action.actor;
        
        // 防御状態を設定（次のダメージを半分にする）
        defender.defendingUntilNextTurn = true;

        return {
            success: true,
            message: `${defender.name}は身を守っている！`,
            effects: [
                {
                    type: 'defend',
                    target: defender
                }
            ]
        };
    }

    /**
     * 魔法行動を実行する
     * @param {Object} action - 魔法行動
     * @returns {Object} 実行結果
     */
    resolveMagicAction(action) {
        const caster = action.actor;
        const spellId = action.params.spellId;
        
        if (!spellId) {
            return {
                success: false,
                message: `${caster.name}の魔法詠唱に失敗しました。`,
                effects: []
            };
        }

        const spellData = this.inventories[spellId];
        if (!spellData) {
            return {
                success: false,
                message: `不明な魔法: ${spellId}`,
                effects: []
            };
        }

        // MP消費チェック
        const mpCost = this.getMagicMpCost(spellData);
        if (caster.currentMp < mpCost) {
            return {
                success: false,
                message: `${caster.name}のMPが足りません。`,
                effects: []
            };
        }

        // MP消費
        caster.currentMp -= mpCost;

        // 魔法効果を解決
        return this.resolveMagicEffect(caster, action.target, spellData);
    }

    /**
     * 魔法効果を解決する
     * @param {Object} caster - 術者
     * @param {Object} target - 対象
     * @param {Object} spellData - 魔法データ
     * @returns {Object} 実行結果
     */
    resolveMagicEffect(caster, target, spellData) {
        const effects = [];
        
        // 回復魔法の場合
        if (spellData.name.includes('回復')) {
            const healAmount = this.calculateHealAmount(caster, spellData);
            const previousHp = target.currentHp;
            target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
            const actualHeal = target.currentHp - previousHp;

            effects.push({
                type: 'heal',
                target: target,
                amount: actualHeal,
                previousHp: previousHp,
                newHp: target.currentHp
            });

            return {
                success: true,
                message: `${caster.name}は${spellData.name}を唱えた！${target.name}のHPが${actualHeal}回復した！`,
                effects: effects
            };
        }
        
        // 攻撃魔法の場合
        if (spellData.name.includes('攻撃') || spellData.name.includes('火') || spellData.name.includes('氷')) {
            const damage = this.calculateMagicDamage(caster, target, spellData);
            const previousHp = target.currentHp;
            target.currentHp = Math.max(0, target.currentHp - damage);
            const actualDamage = previousHp - target.currentHp;

            effects.push({
                type: 'magic_damage',
                target: target,
                amount: actualDamage,
                previousHp: previousHp,
                newHp: target.currentHp
            });

            let message = `${caster.name}は${spellData.name}を唱えた！${target.name}に${actualDamage}のダメージ！`;
            
            if (target.currentHp <= 0) {
                message += `\n${target.name}は倒れた！`;
                effects.push({
                    type: 'defeat',
                    target: target
                });
            }

            return {
                success: true,
                message: message,
                effects: effects
            };
        }

        // その他の魔法
        return {
            success: true,
            message: `${caster.name}は${spellData.name}を唱えた！`,
            effects: effects
        };
    }

    /**
     * アイテム使用行動を実行する
     * @param {Object} action - アイテム使用行動
     * @returns {Object} 実行結果
     */
    resolveItemAction(action) {
        const user = action.actor;
        const itemId = action.params.itemId;
        
        if (!itemId) {
            return {
                success: false,
                message: `${user.name}のアイテム使用に失敗しました。`,
                effects: []
            };
        }

        const itemData = this.inventories[itemId];
        if (!itemData) {
            return {
                success: false,
                message: `不明なアイテム: ${itemId}`,
                effects: []
            };
        }

        // アイテム効果を解決
        return this.resolveItemEffect(user, action.target, itemData);
    }

    /**
     * アイテム効果を解決する
     * @param {Object} user - 使用者
     * @param {Object} target - 対象
     * @param {Object} itemData - アイテムデータ
     * @returns {Object} 実行結果
     */
    resolveItemEffect(user, target, itemData) {
        const effects = [];
        
        // 回復アイテムの場合
        if (itemData.name.includes('薬') || itemData.name.includes('回復')) {
            const healAmount = this.calculateItemHealAmount(itemData);
            const previousHp = target.currentHp;
            target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
            const actualHeal = target.currentHp - previousHp;

            effects.push({
                type: 'item_heal',
                target: target,
                amount: actualHeal,
                previousHp: previousHp,
                newHp: target.currentHp
            });

            return {
                success: true,
                message: `${user.name}は${itemData.name}を使った！${target.name}のHPが${actualHeal}回復した！`,
                effects: effects
            };
        }

        return {
            success: true,
            message: `${user.name}は${itemData.name}を使った！`,
            effects: effects
        };
    }

    /**
     * 魔法のMP消費量を取得する
     * @param {Object} spellData - 魔法データ
     * @returns {number} MP消費量
     */
    getMagicMpCost(spellData) {
        // TODO: マスターデータにMP消費量を追加
        if (spellData.name.includes('回復')) {
            return spellData.name.includes('小') ? 3 : spellData.name.includes('大') ? 10 : 5;
        }
        return 5; // デフォルト
    }

    /**
     * 回復量を計算する
     * @param {Object} caster - 術者
     * @param {Object} spellData - 魔法データ
     * @returns {number} 回復量
     */
    calculateHealAmount(caster, spellData) {
        const baseHeal = spellData.name.includes('小') ? 25 : spellData.name.includes('大') ? 80 : 50;
        const random = Math.floor(Math.random() * 10) - 5; // -5から+4の乱数
        return Math.max(1, baseHeal + random);
    }

    /**
     * 魔法ダメージを計算する
     * @param {Object} caster - 術者
     * @param {Object} target - 対象
     * @param {Object} spellData - 魔法データ
     * @returns {number} ダメージ量
     */
    calculateMagicDamage(caster, target, spellData) {
        const baseDamage = 30;
        const random = Math.floor(Math.random() * 20); // 0-19の乱数
        return Math.max(1, baseDamage + random);
    }

    /**
     * アイテム回復量を計算する
     * @param {Object} itemData - アイテムデータ
     * @returns {number} 回復量
     */
    calculateItemHealAmount(itemData) {
        if (itemData.name.includes('薬草')) return 30;
        if (itemData.name.includes('特薬')) return 100;
        return 20; // デフォルト
    }

    /**
     * アクターが生存しているかチェック
     * @param {Object} actor - アクター
     * @returns {boolean} 生存しているかどうか
     */
    isActorAlive(actor) {
        return actor && actor.isAlive && actor.isAlive();
    }
}

/**
 * ダメージ計算クラス
 */
class DamageCalculator {
    constructor(actors, inventories) {
        this.actors = actors;
        this.inventories = inventories;
    }

    /**
     * 物理ダメージを計算する
     * @param {Object} attacker - 攻撃者
     * @param {Object} target - 対象
     * @returns {number} ダメージ量
     */
    calculatePhysicalDamage(attacker, target) {
        // 攻撃者の攻撃力合計を計算
        const attackerTotalAttack = attacker.getTotalAttackPower();
        
        // 相手の防御力を取得
        const targetDefence = target.getDefence();
        
        // ダメージ計算式: (攻撃力合計 / 2) + (防御力 / 4)
        let damage = Math.floor(attackerTotalAttack / 2) + Math.floor(targetDefence / 4);
        
        // 防御状態の場合はダメージ半分
        if (target.isDefending()) {
            damage = Math.floor(damage / 2);
            target.setDefending(false); // 防御状態を解除
        }

        return Math.max(1, damage);
    }
}


// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ActionResolver, DamageCalculator };
} else {
    window.ActionResolver = ActionResolver;
    window.DamageCalculator = DamageCalculator;
}