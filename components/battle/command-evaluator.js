/**
 * コマンド評価器クラス
 * inventoriesマスターのcommand_id配列を評価し、ゲーム内効果を適用する
 */
class CommandEvaluator {
    constructor(commandsData, inventoriesData, messagesData = {}, locale = 'ja') {
        this.commandsData = commandsData;
        this.inventoriesData = inventoriesData;
        this.messagesData = messagesData;
        this.locale = locale;
        this.register = 0; // Aレジスタ
        this.battleRules = {}; // バトルルール状態
        this.selectedTarget = null; // コマンド評価中に設定されるターゲット
        this.playerParty = null; // ランダムターゲット選択用
    }

    /**
     * アイテムのコマンド配列を評価する
     * @param {Object} actor - コマンドを実行するアクター
     * @param {string} inventoryId - inventoryのID
     * @param {Object} target - 対象（必要に応じて）
     * @param {Array} playerParty - プレイヤーパーティ（ランダムターゲット選択用）
     * @returns {Object} 評価結果
     */
    evaluateCommands(actor, inventoryId, target = null, playerParty = null) {
        //console.log('evaluateCommands start:', { actor: actor.name, inventoryId, target: target?.name, playerPartyCount: playerParty?.length });
        
        const inventory = this.inventoriesData[inventoryId];
        if (!inventory || !inventory.commands) {
            //console.log('Inventory or commands not found:', inventoryId);
            return {
                success: false,
                message: `アイテム ${inventoryId} のコマンドが見つかりません`,
                effects: []
            };
        }

        //console.log('Found inventory commands:', inventory.commands.length);
        this.resetState();
        this.playerParty = playerParty; // ランダムターゲット選択用に保存
        const results = [];

        for (let i = 0; i < inventory.commands.length; i++) {
            const command = inventory.commands[i];
            //console.log(`Executing command ${i + 1}/${inventory.commands.length}:`, command.command_id);
            
            const result = this.executeCommand(actor, command, target);
            //console.log(`Command ${i + 1} result:`, { success: result.success, message: result.message, effectsCount: result.effects?.length || 0 });
            
            results.push(result);
            
            // コマンドが失敗した場合は中断
            if (!result.success) {
                console.warn('Command failed, aborting:', result.message);
                return result;
            }
        }

        const finalResult = {
            success: true,
            message: results.map(r => r.message).filter(m => m).join('\n'),
            effects: results.flatMap(r => r.effects || []),
            battleRules: this.battleRules,
            selectedTarget: this.selectedTarget // コマンド評価で設定されたターゲット
        };
        
        //console.log('evaluateCommands final result:', { success: finalResult.success, selectedTarget: finalResult.selectedTarget?.name, effectsCount: finalResult.effects.length });
        
        return finalResult;
    }

    /**
     * 単一コマンドを実行する
     * @param {Object} actor - 実行者
     * @param {Object} command - コマンド
     * @param {Object} target - 対象
     * @returns {Object} 実行結果
     */
    executeCommand(actor, command, target) {
        // 現在のactorを保存（メッセージ表示で使用）
        this.currentActor = actor;
        const commandId = command.command_id;
        //console.log('executeCommand:', { commandId, target: target?.name });
        
        const commandData = this.commandsData[commandId];

        if (!commandId) {
            console.error('Command ID is undefined - this indicates a missing command_id in master data');
            return {
                success: false,
                message: 'コマンドIDが設定されていません（マスターデータの不備）',
                effects: []
            };
        }

        if (!commandData) {
            console.error('Command data not found:', commandId);
            return {
                success: false,
                message: `不明なコマンド: ${commandId}`,
                effects: []
            };
        }

        // console.log('Command data found:', commandData.name, 'isMarco:', !!(commandData.sub_commands && commandData.sub_commands.length > 0));

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
        //console.log('executeMacroCommand:', commandData.name, 'with', commandData.sub_commands.length, 'sub-commands');
        
        const results = [];

        for (let i = 0; i < commandData.sub_commands.length; i++) {
            const subCommand = commandData.sub_commands[i];
            //console.log(`Executing sub-command ${i + 1}/${commandData.sub_commands.length}:`, subCommand.command_id);
            
            // 引数の解決
            const arg = this.resolveArgument(parentCommand, subCommand.arg);
            //console.log('Resolved arg:', arg);
            
            // サブコマンドオブジェクトを構築
            const resolvedSubCommand = {
                command_id: subCommand.command_id,
                arg1: arg,
                arg2: null,
                arg3: null
            };

            // サブコマンド実行時は、すでに設定されたselectedTargetを優先
            const targetForSubCommand = this.selectedTarget || target;
            //console.log('Target for sub-command:', targetForSubCommand?.name);
            
            const result = this.executeCommand(actor, resolvedSubCommand, targetForSubCommand);
            //console.log(`Sub-command ${i + 1} result:`, { success: result.success, message: result.message });
            
            results.push(result);

            // サブコマンドが失敗した場合は中断
            if (!result.success) {
                console.error('Sub-command failed, aborting macro:', result.message);
                return result;
            }
        }

        //console.log('Macro command completed successfully');
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

        // console.log(`基本command「${commandData.name}」評価`)

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
            
            case 'ランダムターゲット設定':
                return this.executeRandomTargetSelection();
            
            default:
                console.error(`未実装のコマンド: ${commandData.name}`);
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
        this.selectedTarget = null;
        this.playerParty = null;
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
        // 攻撃者の基本攻撃力にレジスタ値を加算してベースダメージを計算
        const baseAttack = actor.attack || 0;
        const baseDamage = baseAttack + this.register;
        
        // ターゲットが指定されていない場合は、selectedTargetを使用
        const actualTarget = target || this.selectedTarget;
        
        //console.log('executeApplyAttack:', { attacker: actor.name, target: actualTarget?.name, baseDamage });
        
        return {
            success: true,
            message: null,
            effects: [{
                type: 'attack',
                attacker: actor,
                target: actualTarget,
                baseDamage: baseDamage,
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
    /**
     * メッセージ表示コマンドを実行する
     * @param {string} messageId - messages.jsonのメッセージID
     * @returns {Object} 実行結果
     */
    executeShowMessage(messageId) {
        // messagesマスターからメッセージを取得
        const messageData = this.messagesData[messageId];
        if (!messageData) {
            return {
                success: false,
                message: `不明なメッセージID: ${messageId}`,
                effects: []
            };
        }
        
        // ロケールに応じたメッセージを取得
        let localizedMessage = messageData[this.locale] || messageData.name || messageId;
        
        // トークン置換を実行
        localizedMessage = this.replaceMessageTokens(localizedMessage);
        
        return {
            success: true,
            message: localizedMessage,
            effects: []
        };
    }
    
    /**
     * メッセージ内のトークンを置換する
     * @param {string} message - 元のメッセージ
     * @returns {string} トークン置換後のメッセージ
     */
    replaceMessageTokens(message) {
        if (!message || typeof message !== 'string') {
            return message;
        }
        
        let replacedMessage = message;
        
        // {actor}トークンを行動者の名前で置換
        if (this.currentActor && this.currentActor.name) {
            replacedMessage = replacedMessage.replace(/\{actor\}/g, this.currentActor.name);
        }
        
        return replacedMessage;
    }
    
    /**
     * ランダムターゲット設定コマンドを実行する
     * @returns {Object} 実行結果
     */
    executeRandomTargetSelection() {
        //console.log('executeRandomTargetSelection called, playerParty:', this.playerParty ? this.playerParty.length : 'null');
        
        if (!this.playerParty || this.playerParty.length === 0) {
            console.error('No playerParty available');
            return {
                success: false,
                message: 'ターゲット選択用のプレイヤーパーティが設定されていません',
                effects: []
            };
        }
        
        // 生存しているプレイヤーからランダムに選択
        const alivePlayers = this.playerParty.filter(player => {
            const alive = player && player.isAlive && player.isAlive();
            //console.log('Player alive check:', player?.name, alive);
            return alive;
        });
        
        //console.log('Alive players count:', alivePlayers.length);
        
        if (alivePlayers.length === 0) {
            return {
                success: false,
                message: '生存しているプレイヤーがいません',
                effects: []
            };
        }
        
        // ランダムにターゲットを選択
        this.selectedTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        //console.log('Selected target:', this.selectedTarget.name);
        
        return {
            success: true,
            message: '', // メッセージは表示しない
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