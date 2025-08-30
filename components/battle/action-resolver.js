/**
 * 行動実行クラス
 * 各種行動（攻撃、防御、魔法、アイテム）の実行と結果を管理する
 */
class ActionResolver {
    constructor(actors, inventories, commandsData, messages = {}, locale = 'ja') {
        this.actors = actors;
        this.inventories = inventories;
        this.commandsData = commandsData;
        this.messages = messages;
        this.locale = locale;
        this.damageCalculator = new DamageCalculator(actors, inventories);
        this.commandEvaluator = new CommandEvaluator(commandsData, inventories, messages, locale);
        this.messageManager = new MessageManager(locale);
    }

    /**
     * 行動を実行する
     * @param {Object} action - 実行する行動
     * @returns {Object} 実行結果
     */
    resolveAction(action) {
        if (!action.actor.isAlive()) {
            return {
                success: false,
                message: this.messageManager.buildErrorMessage('actor_unable_to_act', { actor: action.actor }),
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
            case 'enemy_action':
                return this.resolveEnemyAction(action);
            default:
                return {
                    success: false,
                    message: this.messageManager.buildErrorMessage('unknown_action', { actionType: action.type }),
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

        if (!target.isAlive()) {
            return {
                success: false,
                message: this.messageManager.buildErrorMessage('target_already_defeated', { attacker: attacker, target: target }),
                effects: []
            };
        }

        // 装備武器のコマンドを評価
        const weaponEffect = this.evaluateWeaponCommands(attacker, target);
        
        //console.log("test",weaponEffect)
        
        // 複数回攻撃の設定があるかチェック
        const multipleAttackCount = weaponEffect.battleRules?.multipleAttack || 1;
        
        const allEffects = [];
        let totalDamage = 0;

        // 指定回数分の攻撃を実行
        for (let i = 0; i < multipleAttackCount; i++) {
            if (!target.isAlive()) {
                break; // 対象が倒れた場合は攻撃を中断
            }

            // ダメージ計算
            const damage = this.damageCalculator.calculatePhysicalDamage(attacker, target, weaponEffect.battleRules);
            
            // ダメージ適用
            const previousHp = target.currentHp;
            target.currentHp = Math.max(0, target.currentHp - damage);
            const actualDamage = previousHp - target.currentHp;
            totalDamage += actualDamage;

            allEffects.push({
                type: 'damage',
                target: target,
                amount: actualDamage,
                previousHp: previousHp,
                newHp: target.currentHp,
                attackNumber: i + 1,
                totalAttacks: multipleAttackCount
            });

            // 対象が倒れた場合
            if (target.currentHp <= 0) {
                allEffects.push({
                    type: 'defeat',
                    target: target
                });
                break;
            }
        }

        return {
            success: true,
            effects: allEffects,
            actionData: {
                type: 'attack',
                attacker: attacker,
                target: target,
                totalDamage: totalDamage,
                multipleAttack: multipleAttackCount > 1
            }
        };
    }

    /**
     * 装備武器のコマンドを評価する
     * @param {Object} actor - 攻撃者
     * @param {Object} target - 対象
     * @returns {Object} コマンド評価結果
     */
    evaluateWeaponCommands(actor, target) {
        // 装備中の武器IDを取得
        const weaponId = actor.equipments?.weapon;
        if (!weaponId) {
            return { battleRules: {}, effects: [] };
        }

        // 武器のコマンドを評価
        return this.commandEvaluator.evaluateCommands(actor, weaponId, target);
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
            effects: [
                {
                    type: 'defend',
                    target: defender
                }
            ],
            actionData: {
                type: 'defend',
                actor: defender
            }
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
                message: this.messageManager.buildErrorMessage('action_failed', { actor: caster, actionName: '魔法詠唱' }),
                effects: []
            };
        }

        const spellData = this.inventories[spellId];
        if (!spellData) {
            return {
                success: false,
                message: this.messageManager.buildErrorMessage('spell_not_found', { spellId: spellId }),
                effects: []
            };
        }

        // CommandEvaluatorを使って魔法のコマンドを実行
        const result = this.commandEvaluator.evaluateCommands(caster, spellId, action.target);
        
        if (!result.success) {
            return {
                success: false,
                message: result.message || `${caster.name}は${spellData.name}を唱えようとしたが失敗した！`,
                effects: []
            };
        }

        return {
            success: true,
            effects: result.effects || [],
            actionData: {
                type: 'magic',
                caster: caster,
                spell: spellData,
                target: action.target
            }
        };
    }


    /**
     * アイテム使用行動を実行する
     * @param {Object} action - アイテム使用行動
     * @returns {Object} 実行結果
     */
    resolveItemAction(action) {
        const user = action.actor;
        const target = action.target;
        const itemId = action.params.itemId;
        
        if (!itemId) {
            return {
                success: false,
                message: this.messageManager.buildErrorMessage('action_failed', { actor: user, actionName: 'アイテム使用' }),
                effects: []
            };
        }

        const itemData = this.inventories[itemId];
        if (!itemData) {
            return {
                success: false,
                message: this.messageManager.buildErrorMessage('item_not_found', { itemId: itemId }),
                effects: []
            };
        }

        // アイテムの消費チェック
        if (!user.hasItem(itemId, 1)) {
            return {
                success: false,
                message: `${itemData.name}が足りない！`,
                effects: []
            };
        }

        // マクロコマンドを評価して効果を実行
        // プレイヤーパーティが必要な場合のため、nullで渡す（必要に応じて実装を拡張）
        const result = this.commandEvaluator.evaluateCommands(user, itemId, target, null);
        
        if (!result.success) {
            return {
                success: false,
                message: result.message,
                effects: []
            };
        }

        // アイテム消費はマクロコマンド内の「消費型アイテム評価」で実行されるため、ここでは実行しない

        return {
            success: true,
            effects: result.effects || [],
            damage: result.damage || 0
        };
    }



    /**
     * 敵のアクションを実行する
     * @param {Object} action - 敵のアクション
     * @returns {Object} 実行結果
     */
    resolveEnemyAction(action) {
        const { actor, actionId, params } = action;
        const playerParty = params ? params.playerParty : null;
        
        //console.log('resolveEnemyAction:', { actor: actor.name, actionId, playerParty: playerParty ? playerParty.length : 0 });
        
        // actionIdからinventoryデータを取得
        const actionData = this.inventories[actionId];
        if (!actionData) {
            console.error('actionData not found:', actionId);
            return {
                success: false,
                message: this.messageManager.buildErrorMessage('unknown_action', { actionType: actionId }),
                effects: []
            };
        }
        
        //console.log('actionData found:', actionData.name, actionData.commands?.length || 0, 'commands');
        
        // CommandEvaluatorを使ってアクションのコマンドを実行
        if (actionData.commands && actionData.commands.length > 0) {
            const result = this.commandEvaluator.evaluateCommands(actor, actionId, null, playerParty);
            //console.log('commandEvaluator result:', { success: result.success, selectedTarget: result.selectedTarget?.name, effectsCount: result.effects?.length || 0 });
            
            // CommandEvaluatorで設定されたターゲットを使用
            const targetFromEvaluator = result.selectedTarget;
            const effects = [];
            
            if (result.success && targetFromEvaluator) {
                // CommandEvaluatorの評価結果でattack効果がある場合はダメージ適用
                const attackEffects = result.effects ? result.effects.filter(e => e.type === 'attack') : [];
                //console.log('attackEffects found:', attackEffects.length);
                if (attackEffects.length > 0) {
                    // 攻撃効果を実際のダメージに変換して適用
                    attackEffects.forEach(attackEffect => {
                        // ダメージ計算：基本ダメージから対象の防御力を引く
                        const baseDamage = attackEffect.baseDamage || 0;
                        const targetDefence = targetFromEvaluator.defence || 0;
                        const finalDamage = Math.max(1, baseDamage - targetDefence);
                        
                        //console.log('damage calculation:', { baseDamage, targetDefence, finalDamage });
                        
                        const actualDamage = targetFromEvaluator.takeDamage(finalDamage);
                        
                        effects.push({
                            type: 'damage',
                            target: targetFromEvaluator,
                            amount: actualDamage
                        });
                    });
                }
            } else {
                // note: no targetな分岐は正常系でも生じるので、一旦ログ出し自体もコメントアウトしておく
                // console.log('Command evaluation failed or no target:', { success: result.success, target: !!targetFromEvaluator });
            }
            
            return {
                success: result.success,
                effects: [...(result.effects || []), ...effects],
                finalTarget: targetFromEvaluator, // 最終的なターゲット情報
                actionData: {
                    type: 'enemy_action',
                    actor: actor,
                    action: actionData,
                    target: targetFromEvaluator
                }
            };
        }
        
        // コマンドが設定されていない場合はデフォルトメッセージ
        return {
            success: true,
            effects: [],
            actionData: {
                type: 'enemy_action',
                actor: actor,
                action: actionData,
                target: null
            }
        };
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
     * @param {Object} battleRules - バトルルール設定
     * @returns {number} ダメージ量
     */
    calculatePhysicalDamage(attacker, target, battleRules = {}) {
        // 攻撃者の攻撃力合計を計算
        const attackerTotalAttack = attacker.getTotalAttackPower();
        
        // 相手の防御力を取得
        const targetDefence = target.getDefence();
        
        // ダメージ計算式: (攻撃力合計 / 2) + (防御力 / 4)
        let damage = Math.floor(attackerTotalAttack / 2) + Math.floor(targetDefence / 4);
        
        // 属性攻撃の効果を適用
        if (battleRules.attribute) {
            // TODO: 属性攻撃の効果を実装（将来拡張）
        }
        
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