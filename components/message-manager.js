/**
 * メッセージ管理クラス
 * バトルアクションの実行結果を基にメッセージを構築し、統一的なメッセージ処理を提供する
 * TODO: 文字列のマスター化と多言語対応……は保留。やる際はこのクラスの修正に加えて、actorやinventoryのnameも統一的に扱うマスター構成の修正も合わせて検討する
 */
class MessageManager {
    constructor(locale = 'ja') {
        this.locale = locale;
    }

    /**
     * アクション実行結果からメッセージを構築する
     * @param {Object} actionResult - ActionResolverの実行結果
     * @param {Object} actionData - 実行されたアクションの詳細データ
     * @returns {string} 構築されたメッセージ
     */
    buildMessage(actionResult, actionData = null) {
        if (!actionResult.success) {
            return actionResult.message || 'アクションの実行に失敗しました。';
        }

        // 既に完成されたメッセージがある場合はそれを使用
        if (actionResult.message) {
            return actionResult.message;
        }

        // effectsからメッセージを構築
        if (actionResult.effects && actionResult.effects.length > 0) {
            return this.buildMessageFromEffects(actionResult.effects, actionData);
        }

        return 'アクションが実行されました。';
    }

    /**
     * effectsの配列からメッセージを構築する
     * @param {Array} effects - 効果の配列
     * @param {Object} actionData - アクションデータ
     * @returns {string} 構築されたメッセージ
     */
    buildMessageFromEffects(effects, actionData = null) {
        const messages = [];

        for (const effect of effects) {
            const message = this.buildEffectMessage(effect, actionData);
            if (message) {
                messages.push(message);
            }
        }

        return messages.join('\n');
    }

    /**
     * 単一のeffectからメッセージを構築する
     * @param {Object} effect - 効果オブジェクト
     * @param {Object} actionData - アクションデータ
     * @returns {string} 構築されたメッセージ
     */
    buildEffectMessage(effect, actionData = null) {
        switch (effect.type) {
            case 'damage':
                return this.buildDamageMessage(effect);
                
            case 'heal':
                return this.buildHealMessage(effect);
                
            case 'magic_damage':
                return this.buildMagicDamageMessage(effect, actionData);
                
            case 'item_heal':
                return this.buildItemHealMessage(effect, actionData);
                
            case 'defeat':
                return this.buildDefeatMessage(effect);
                
            case 'defend':
                return this.buildDefendMessage(effect);
                
            case 'attack':
                // CommandEvaluator由来のattack effectは通常ダメージ計算前なので、
                // ここではメッセージ生成しない
                return '';
                
            default:
                return '';
        }
    }

    /**
     * 攻撃アクションのメッセージを構築する
     * @param {Object} actionResult - アクション実行結果
     * @param {string} attackerName - 攻撃者名
     * @param {string} targetName - 対象名
     * @returns {string} 攻撃メッセージ
     */
    buildAttackMessage(actionResult, attackerName, targetName) {
        const damageEffects = actionResult.effects.filter(e => e.type === 'damage');
        const defeatEffects = actionResult.effects.filter(e => e.type === 'defeat');
        
        if (damageEffects.length === 0) {
            return `${attackerName}の攻撃！しかし${targetName}にダメージを与えられなかった！`;
        }

        const messages = [];
        let totalDamage = 0;
        const multipleAttack = damageEffects.length > 1;

        // 各攻撃のメッセージを構築
        damageEffects.forEach((effect, index) => {
            totalDamage += effect.amount;
            
            if (multipleAttack) {
                messages.push(`${attackerName}の${effect.attackNumber || index + 1}回目の攻撃！${targetName}に${effect.amount}のダメージ！`);
            } else {
                messages.push(`${attackerName}の攻撃！${targetName}に${effect.amount}のダメージ！`);
            }
        });

        // 倒された場合のメッセージを追加
        if (defeatEffects.length > 0) {
            messages.push(`${targetName}は倒れた！`);
        }

        // 複数回攻撃の場合は総ダメージも表示
        if (multipleAttack) {
            messages.push(`総ダメージ: ${totalDamage}`);
        }

        return messages.join('\n');
    }

    /**
     * ダメージ効果のメッセージを構築する
     * @param {Object} effect - ダメージ効果
     * @returns {string} ダメージメッセージ
     */
    buildDamageMessage(effect) {
        if (effect.amount <= 0) {
            return '';
        }
        
        const targetName = effect.target?.name || '対象';
        return `${targetName}に${effect.amount}のダメージ！`;
    }

    /**
     * 回復効果のメッセージを構築する
     * @param {Object} effect - 回復効果
     * @returns {string} 回復メッセージ
     */
    buildHealMessage(effect) {
        if (effect.amount <= 0) {
            return '';
        }
        
        const targetName = effect.target?.name || '対象';
        return `${targetName}のHPが${effect.amount}回復した！`;
    }

    /**
     * 魔法ダメージ効果のメッセージを構築する
     * @param {Object} effect - 魔法ダメージ効果
     * @param {Object} actionData - アクションデータ
     * @returns {string} 魔法ダメージメッセージ
     */
    buildMagicDamageMessage(effect, actionData) {
        const targetName = effect.target?.name || '対象';
        const spellName = actionData?.name || '魔法';
        return `${spellName}により${targetName}に${effect.amount}のダメージ！`;
    }

    /**
     * アイテム回復効果のメッセージを構築する
     * @param {Object} effect - アイテム回復効果
     * @param {Object} actionData - アクションデータ
     * @returns {string} アイテム回復メッセージ
     */
    buildItemHealMessage(effect, actionData) {
        const targetName = effect.target?.name || '対象';
        const itemName = actionData?.name || 'アイテム';
        return `${itemName}により${targetName}のHPが${effect.amount}回復した！`;
    }

    /**
     * 撃破効果のメッセージを構築する
     * @param {Object} effect - 撃破効果
     * @returns {string} 撃破メッセージ
     */
    buildDefeatMessage(effect) {
        const targetName = effect.target?.name || '対象';
        return `${targetName}は倒れた！`;
    }

    /**
     * 防御効果のメッセージを構築する
     * @param {Object} effect - 防御効果
     * @returns {string} 防御メッセージ
     */
    buildDefendMessage(effect) {
        const targetName = effect.target?.name || '対象';
        return `${targetName}は身を守っている！`;
    }

    /**
     * 魔法アクションのメッセージを構築する
     * @param {Object} actionResult - アクション実行結果
     * @param {string} casterName - 術者名
     * @param {string} spellName - 魔法名
     * @returns {string} 魔法メッセージ
     */
    buildMagicMessage(actionResult, casterName, spellName) {
        const messages = [`${casterName}は${spellName}を唱えた！`];
        this.buildMessagesWithHealEffects(messages, actionResult, ['magic_heal', 'heal']);
        return messages.join('\n');
    }

    /**
     * 回復効果の詳細メッセージを構築する（効果の有無を考慮）
     * @param {Object} healEffect - 回復効果
     * @returns {string} 回復効果メッセージ
     */
    buildHealEffectMessage(healEffect) {
        if (!healEffect.target) {
            return '';
        }
        
        // 実際の回復量を計算するため、現在のHPと最大HPを確認
        const currentHp = healEffect.target.currentHp;
        const maxHp = healEffect.target.maxHp;
        const healAmount = healEffect.baseHeal || healEffect.amount || 0;
        const actualHeal = Math.min(healAmount, maxHp - currentHp);
        
        if (actualHeal > 0) {
            return `${healEffect.target.name}のHPが${actualHeal}ポイント回復した！`;
        } else {
            return 'しかし効果はなかった！';
        }
    }

    /**
     * 回復効果を含むアクションのメッセージを構築する（共通処理）
     * @param {Array} messages - メッセージ配列
     * @param {Object} actionResult - アクション実行結果
     * @param {Array} healEffectTypes - 対象とする回復効果タイプ
     * @returns {Array} メッセージ配列
     */
    buildMessagesWithHealEffects(messages, actionResult, healEffectTypes) {
        const healEffects = (actionResult.effects || []).filter(effect => 
            healEffectTypes.includes(effect.type)
        );
        
        if (healEffects.length > 0) {
            healEffects.forEach(healEffect => {
                if (healEffect.target) {
                    const healMessage = this.buildHealEffectMessage(healEffect);
                    if (healMessage) {
                        messages.push(healMessage);
                    }
                }
            });
        } else {
            // 回復効果以外の効果メッセージを追加
            const effectMessages = this.buildMessageFromEffects(actionResult.effects);
            if (effectMessages) {
                messages.push(effectMessages);
            }
        }
        
        return messages;
    }

    /**
     * アイテム使用アクションのメッセージを構築する
     * @param {Object} actionResult - アクション実行結果
     * @param {string} userName - 使用者名
     * @param {string} itemName - アイテム名
     * @param {Object} itemData - アイテムデータ（アイテムタイプ判定に使用）
     * @returns {string} アイテム使用メッセージ
     */
    buildItemMessage(actionResult, userName, itemName, itemData = null) {
        // 武器を道具として使用した場合の特別処理
        // undone: 将来的に実装する際は「武器をアイテムとして使った場合の効果を定義する専用のinventoryマスター」の作成・実装が必要になる見込み。今回のサンプルでは実装しない。
        if (itemData && itemData.type === 'weapon') {
            return `${userName}は${itemName}を掲げた。しかし何も起こらなかった！`;
        }
        
        const messages = [`${userName}は${itemName}を使った！`];
        this.buildMessagesWithHealEffects(messages, actionResult, ['item_heal', 'heal']);
        return messages.join('\n');
    }

    /**
     * 敵アクションのメッセージを構築する
     * @param {Object} actionResult - アクション実行結果
     * @param {string} enemyName - 敵名
     * @param {string} actionName - アクション名
     * @returns {string} 敵アクションメッセージ
     */
    buildEnemyActionMessage(actionResult, enemyName, actionName) {
        // actionResultに既にメッセージが構築されている場合はそれを優先
        if (actionResult.message && actionResult.message !== `${enemyName}は${actionName}！`) {
            return actionResult.message;
        }

        const messages = [`${enemyName}は${actionName}！`];
        
        // ダメージ効果がある場合は追加
        const damageEffects = actionResult.effects?.filter(e => e.type === 'damage') || [];
        damageEffects.forEach(effect => {
            const targetName = effect.target?.name || '対象';
            messages.push(`${targetName}に${effect.amount}のダメージ！`);
            
            // 対象が倒れた場合
            if (effect.target && effect.target.currentHp <= 0) {
                messages.push(`${targetName}は倒れた！`);
            }
        });
        
        return messages.join('\n');
    }

    /**
     * バトル状況メッセージを構築する
     * @param {string} messageType - メッセージタイプ
     * @param {Object} params - パラメータ
     * @returns {string} バトル状況メッセージ
     */
    buildBattleStatusMessage(messageType, params = {}) {
        switch (messageType) {
            case 'battle_start':
                return 'バトル開始！';
                
            case 'enemy_appears':
                return '魔物の群れが現れた！ 魔物の群れは、こちらが身構える前に襲いかかってきた！';
                
            case 'enemy_appears_player_first':
                return '魔物の群れが現れた！';
                
            case 'turn_start':
                const characterName = params.character?.name || 'キャラクター';
                return `${characterName}のターン！`;
                
            case 'battle_end':
                return params.victory ? '勝利！' : '敗北...';
                
            case 'escape_success':
                return 'パーティは逃げ出した！';
                
            case 'escape_failed':
                return '逃げられなかった！';
                
            case 'exp_gained':
                return `${params.exp || 0}の経験値を獲得した！`;
                
            case 'level_up':
                const levelUpCharacter = params.character?.name || 'キャラクター';
                return `${levelUpCharacter}はレベルが上がった！`;
                
            default:
                return params.text || '';
        }
    }

    /**
     * エラーメッセージを構築する
     * @param {string} errorType - エラータイプ
     * @param {Object} params - パラメータ
     * @returns {string} エラーメッセージ
     */
    buildErrorMessage(errorType, params = {}) {
        switch (errorType) {
            case 'target_already_defeated':
                const attackerName = params.attacker?.name || '攻撃者';
                const targetName = params.target?.name || '対象';
                return `${attackerName}の攻撃！しかし${targetName}はすでに倒れている！`;
                
            case 'actor_unable_to_act':
                const actorName = params.actor?.name || '行動者';
                return `${actorName}は行動不能です。`;
                
            case 'unknown_action':
                const actionType = params.actionType || 'アクション';
                return `不明な行動: ${actionType}`;
                
            case 'mp_insufficient':
                const casterName = params.caster?.name || '術者';
                return `${casterName}のMPが足りません。`;
                
            case 'item_not_found':
                const itemId = params.itemId || 'アイテム';
                return `不明なアイテム: ${itemId}`;
                
            case 'spell_not_found':
                const spellId = params.spellId || '魔法';
                return `不明な魔法: ${spellId}`;
                
            case 'action_failed':
                const failedActorName = params.actor?.name || '行動者';
                const actionName = params.actionName || 'アクション';
                return `${failedActorName}の${actionName}に失敗しました。`;
                
            default:
                return params.message || 'エラーが発生しました。';
        }
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MessageManager };
} else {
    window.MessageManager = MessageManager;
}