/**
 * コマンド評価器クラス
 * inventoriesマスターのcommand_id配列を評価し、ゲーム内効果を適用する
 */
class CommandEvaluator {
    constructor(commandsData, inventoriesData) {
        this.commandsData = commandsData;
        this.inventoriesData = inventoriesData;
        this.register = 0; // Aレジスタ
        this.battleRules = {}; // バトルルール状態
    }

    /**
     * アイテムのコマンド配列を評価する
     * @param {Object} actor - コマンドを実行するアクター
     * @param {string} inventoryId - inventoryのID
     * @param {Object} target - 対象（必要に応じて）
     * @returns {Object} 評価結果
     */
    evaluateCommands(actor, inventoryId, target = null) {
        const inventory = this.inventoriesData[inventoryId];
        if (!inventory || !inventory.commands) {
            return {
                success: false,
                message: `アイテム ${inventoryId} のコマンドが見つかりません`,
                effects: []
            };
        }

        this.resetState();
        const results = [];

        for (const command of inventory.commands) {
            const result = this.executeCommand(actor, command, target);
            results.push(result);
            
            // コマンドが失敗した場合は中断
            if (!result.success) {
                return result;
            }
        }

        return {
            success: true,
            message: results.map(r => r.message).filter(m => m).join('\n'),
            effects: results.flatMap(r => r.effects || []),
            battleRules: this.battleRules
        };
    }

    /**
     * 単一コマンドを実行する
     * @param {Object} actor - 実行者
     * @param {Object} command - コマンド
     * @param {Object} target - 対象
     * @returns {Object} 実行結果
     */
    executeCommand(actor, command, target) {
        const commandId = command.command_id;
        const commandData = this.commandsData[commandId];

        if (!commandData) {
            return {
                success: false,
                message: `不明なコマンド: ${commandId}`,
                effects: []
            };
        }

        // マクロコマンドの場合はサブコマンドを実行
        if (commandData.sub_commands && commandData.sub_commands.length > 0) {
            return this.executeMacroCommand(actor, command, commandData, target);
        }

        // 基本コマンドを実行
        return this.executeBasicCommand(actor, command, commandData, target);
    }

    /**
     * マクロコマンドを実行する
     * @param {Object} actor - 実行者
     * @param {Object} parentCommand - 親コマンド
     * @param {Object} commandData - コマンドデータ
     * @param {Object} target - 対象
     * @returns {Object} 実行結果
     */
    executeMacroCommand(actor, parentCommand, commandData, target) {
        const results = [];

        for (const subCommand of commandData.sub_commands) {
            // 引数の解決
            const arg = this.resolveArgument(parentCommand, subCommand.arg);
            
            // サブコマンドオブジェクトを構築
            const resolvedSubCommand = {
                command_id: subCommand.command_id,
                arg1: arg,
                arg2: null,
                arg3: null
            };

            const result = this.executeCommand(actor, resolvedSubCommand, target);
            results.push(result);

            // サブコマンドが失敗した場合は中断
            if (!result.success) {
                return result;
            }
        }

        return {
            success: true,
            message: results.map(r => r.message).filter(m => m).join('\n'),
            effects: results.flatMap(r => r.effects || [])
        };
    }

    /**
     * 基本コマンドを実行する
     * @param {Object} actor - 実行者
     * @param {Object} command - コマンド
     * @param {Object} commandData - コマンドデータ
     * @param {Object} target - 対象
     * @returns {Object} 実行結果
     */
    executeBasicCommand(actor, command, commandData, target) {
        const arg1 = command.arg1;
        const arg2 = command.arg2;
        const arg3 = command.arg3;

        console.log(`基本command「${commandData.name}」評価`)

        switch (commandData.name) {
            case '定数加算':
                return this.executeAdd(parseInt(arg1) || 0);
            
            case '定数乗算':
                return this.executeMultiply(parseInt(arg1) || 1);
            
            case '乱数加算':
                return this.executeRandomAdd(parseInt(arg1) || 0);
            
            case '攻撃点ルール適用':
                return this.executeApplyAttack(actor, target);
            
            case '複数回攻撃ルール設定':
                return this.executeSetMultipleAttack(parseInt(arg1) || 1);
            
            case '全体攻撃ルール設定':
                return this.executeSetWholeAttack();
            
            case '攻撃属性「火」設定':
                return this.executeSetAttackAttributeFire();
            
            case 'MP評価':
                return this.executeEvaluateMagicPoint(actor, parseInt(arg1) || 0);
            
            case '消費型アイテム評価':
                return this.executeEvaluateConsumeQuantity(actor, parseInt(arg1) || 1);
            
            case '魔法回復ルール適用':
                return this.executeApplyMagicHeal(actor, target);
            
            case '薬草回復ルール適用':
                return this.executeApplyItemHeal(actor, target);
            
            case 'メッセージ表示':
                return this.executeShowMessage(arg1);
            
            default:
                return {
                    success: false,
                    message: `未実装のコマンド: ${commandData.name}`,
                    effects: []
                };
        }
    }

    /**
     * 引数を解決する
     * @param {Object} parentCommand - 親コマンド
     * @param {string} argSpec - 引数指定（"arg1", "arg2", "arg3", または直接値）
     * @returns {*} 解決された引数値
     */
    resolveArgument(parentCommand, argSpec) {
        if (!argSpec) return null;
        
        if (argSpec === 'arg1') return parentCommand.arg1;
        if (argSpec === 'arg2') return parentCommand.arg2;
        if (argSpec === 'arg3') return parentCommand.arg3;
        
        // 直接値の場合はそのまま返す
        return argSpec;
    }

    /**
     * 状態をリセットする
     */
    resetState() {
        this.register = 0;
        this.battleRules = {};
    }

    // ======== 基本コマンド実装 ========

    /**
     * 定数加算コマンド
     * @param {number} value - 加算値
     */
    executeAdd(value) {
        this.register += value;
        return {
            success: true,
            message: null,
            effects: []
        };
    }

    /**
     * 定数乗算コマンド
     * @param {number} value - 乗算値
     */
    executeMultiply(value) {
        this.register *= value;
        return {
            success: true,
            message: null,
            effects: []
        };
    }

    /**
     * 乱数加算コマンド
     * @param {number} max - 最大値（0～max-1の範囲）
     */
    executeRandomAdd(max) {
        if (max > 0) {
            this.register += Math.floor(Math.random() * max);
        }
        return {
            success: true,
            message: null,
            effects: []
        };
    }

    /**
     * 攻撃点ルール適用コマンド
     * @param {Object} actor - 攻撃者
     * @param {Object} target - 対象
     */
    executeApplyAttack(actor, target) {
        return {
            success: true,
            message: null,
            effects: [{
                type: 'attack',
                attacker: actor,
                target: target,
                baseDamage: this.register,
                battleRules: { ...this.battleRules }
            }]
        };
    }

    /**
     * 複数回攻撃ルール設定コマンド
     * @param {number} count - 攻撃回数
     */
    executeSetMultipleAttack(count) {
        this.battleRules.multipleAttack = count;
        return {
            success: true,
            message: null,
            effects: []
        };
    }

    /**
     * 全体攻撃ルール設定コマンド
     */
    executeSetWholeAttack() {
        this.battleRules.wholeAttack = true;
        return {
            success: true,
            message: null,
            effects: []
        };
    }

    /**
     * 攻撃属性「火」設定コマンド
     */
    executeSetAttackAttributeFire() {
        this.battleRules.attribute = 'fire';
        return {
            success: true,
            message: null,
            effects: []
        };
    }

    /**
     * MP評価コマンド
     * @param {Object} actor - 評価対象者
     * @param {number} cost - 必要MP
     */
    executeEvaluateMagicPoint(actor, cost) {
        if (actor.currentMp < cost) {
            return {
                success: false,
                message: `${actor.name}のMPが足りません`,
                effects: []
            };
        }
        
        actor.currentMp -= cost;
        return {
            success: true,
            message: null,
            effects: [{
                type: 'mp_consume',
                target: actor,
                amount: cost
            }]
        };
    }

    /**
     * 消費型アイテム評価コマンド
     * @param {Object} actor - 使用者
     * @param {number} quantity - 消費個数
     */
    executeEvaluateConsumeQuantity(actor, quantity) {
        // TODO: インベントリシステムと連携して実装
        return {
            success: true,
            message: null,
            effects: [{
                type: 'item_consume',
                target: actor,
                amount: quantity
            }]
        };
    }

    /**
     * 魔法回復ルール適用コマンド
     * @param {Object} actor - 詠唱者
     * @param {Object} target - 対象
     */
    executeApplyMagicHeal(actor, target) {
        return {
            success: true,
            message: null,
            effects: [{
                type: 'magic_heal',
                caster: actor,
                target: target,
                baseHeal: this.register
            }]
        };
    }

    /**
     * 薬草回復ルール適用コマンド
     * @param {Object} actor - 使用者
     * @param {Object} target - 対象
     */
    executeApplyItemHeal(actor, target) {
        return {
            success: true,
            message: null,
            effects: [{
                type: 'item_heal',
                user: actor,
                target: target,
                baseHeal: this.register
            }]
        };
    }

    /**
     * メッセージ表示コマンド
     * @param {string} message - 表示メッセージ
     */
    executeShowMessage(message) {
        return {
            success: true,
            message: message,
            effects: []
        };
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandEvaluator;
} else {
    window.CommandEvaluator = CommandEvaluator;
}