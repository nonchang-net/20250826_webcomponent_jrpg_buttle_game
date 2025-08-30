/**
 * ターン制バトルルール実装クラス
 * battle_rule_1.mdで定義されたターン制バトルシステムを実装する
 * 
 * デバッグ用ログ:
 * - 各メソッドには "// DEBUG" とマークされたconsole.logが含まれています
 * - 必要に応じてコメントアウトを解除してデバッグに活用してください
 */
class TurnBasedBattleRule extends BattleRuleBase {
    // メッセージ表示完了後の待機時間定数
    static MESSAGE_COMPLETION_WAIT_TIME = 200; // メッセージ表示完了後の待機時間（ミリ秒）
    constructor(actors, inventories, commands, messages, locale, playerParty, enemyParty, actionResolver, stateManager) {
        super(actors, inventories, commands, messages, locale, playerParty, enemyParty, actionResolver);
        
        this.stateManager = stateManager;
        
        // バトル状態管理
        this.phase = 'initial'; // 'initial', 'player_selection', 'turn_execution', 'battle_end'
        this.currentPlayerIndex = 0;
        this.playerActions = [];
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        
        // 行動キャンセル履歴
        this.actionHistory = [];
        
        // メッセージマネージャー
        this.messageManager = new MessageManager(locale);
    }

    /**
     * フェーズを変更し、StateManagerに反映する
     * @param {string} newPhase - 新しいフェーズ
     */
    setPhase(newPhase) {
        // console.log('フェーズ変更:', this.phase, '->', newPhase); // DEBUG
        this.phase = newPhase;
        if (this.stateManager) {
            this.stateManager.setPhase(newPhase);
        }
    }

    /**
     * バトル開始時の初期化処理
     */
    initializeBattle() {
        // HP/MPを初期化
        this.initializeAllStats();
        
        // バトル開始
        this.setPhase('initial');
    }

    /**
     * バトルを開始する
     */
    async startBattle() {
        // console.log('TurnBasedBattleRule: startBattle開始'); // DEBUG
        
        // ランダムで先攻後攻を決定
        // const isEnemyFirst = Math.random() < 0.5;
        // テスト用: 敵先行はUIテストのイテレーションを悪くするため一旦解除
        const isEnemyFirst = false;
        // console.log('先攻判定:', isEnemyFirst ? '敵先攻' : 'プレイヤー先攻'); // DEBUG
        
        if (isEnemyFirst) {
            // 1a: 敵先攻
            // console.log('敵先攻パターンを実行'); // DEBUG
            await this.showMessageAndWait(this.messageManager.buildBattleStatusMessage('enemy_appears'));
            this.executeEnemyTurn();
        } else {
            // 1b: プレイヤー先攻
            // console.log('プレイヤー先攻パターンを実行'); // DEBUG
            await this.showMessageAndWait(this.messageManager.buildBattleStatusMessage('enemy_appears_player_first'));
            await this.startPlayerActionSelection();
        }
        
        // console.log('TurnBasedBattleRule: startBattle完了'); // DEBUG
    }

    /**
     * ユーザー行動選択を開始する
     */
    async startPlayerActionSelection() {
        // console.log('startPlayerActionSelection開始'); // DEBUG
        this.setPhase('player_selection');
        this.currentPlayerIndex = 0;
        this.playerActions = [];
        // console.log('フェーズを player_selection に変更'); // DEBUG
        await this.selectNextPlayerAction();
        // console.log('startPlayerActionSelection完了'); // DEBUG
    }

    /**
     * 次のプレイヤーの行動選択を促す
     * @param {boolean} suppressUICallback - UI更新コールバックを抑制するかどうか
     */
    async selectNextPlayerAction(suppressUICallback = false) {
        // console.log('selectNextPlayerAction開始, currentPlayerIndex:', this.currentPlayerIndex); // DEBUG
        
        const alivePlayersCount = this.playerParty.filter(p => p.isAlive()).length;
        // console.log('生存プレイヤー数:', alivePlayersCount); // DEBUG
        
        if (this.currentPlayerIndex >= alivePlayersCount) {
            // 全員の行動が決定したので、ターン実行へ
            // console.log('全員の行動決定、ターン実行開始'); // DEBUG
            this.executeTurn();
            return;
        }

        const currentPlayer = this.getAlivePlayerByIndex(this.currentPlayerIndex);
        // console.log('現在のプレイヤー:', currentPlayer ? currentPlayer.name : 'null'); // DEBUG
        
        if (currentPlayer) {
            // StateManagerに現在のプレイヤーを設定
            if (this.stateManager) {
                this.stateManager.setCurrentPlayer(currentPlayer);
            }
            
            // プレイヤー選択メッセージを表示し、完了後に待機
            const message = `${currentPlayer.name}の行動を選択してください`;
            // console.log('メッセージ表示:', message); // DEBUG
            await this.showMessageAndWait(message);
            // console.log('メッセージ表示完了'); // DEBUG
            
            // UI更新: 現在選択中のプレイヤーを通知（キャンセル時は抑制）
            if (this.uiUpdateCallback && !suppressUICallback) {
                // console.log('UI更新コールバック実行'); // DEBUG
                this.uiUpdateCallback('player_selection', {
                    currentPlayer: currentPlayer,
                    canCancel: this.currentPlayerIndex > 0
                });
            } else {
                // console.log('UI更新コールバックが抑制または設定されていない'); // DEBUG
            }
        }
        
        // console.log('selectNextPlayerAction完了'); // DEBUG
    }

    /**
     * 指定されたキャラクターの行動を設定する
     * @param {Object} actor - アクター
     * @param {string} actionType - 行動種別 ('fight', 'defend', 'magic', 'item')
     * @param {Object} target - ターゲット
     * @param {Object} params - その他のパラメーター (itemId, spellId等)
     */
    async setPlayerAction(actor, actionType, target, params = {}) {
        const action = {
            actor: actor,
            type: actionType,
            target: target,
            params: params
        };

        this.playerActions[this.currentPlayerIndex] = action;
        this.actionHistory.push(action);
        
        this.currentPlayerIndex++;
        await this.selectNextPlayerAction();
    }

    /**
     * 前の行動選択に戻る（Escキーでのキャンセル）
     */
    async cancelLastAction() {
        if (this.currentPlayerIndex <= 0 || this.phase !== 'player_selection') {
            return false; // 最初のプレイヤーはキャンセルできない
        }

        this.currentPlayerIndex--;
        this.playerActions.pop();
        this.actionHistory.pop();
        
        // キャンセル時はUI更新を抑制するためのフラグ付きで呼び出し
        await this.selectNextPlayerAction(true);
        return true;
    }

    /**
     * ターン実行を開始する
     */
    executeTurn() {
        this.setPhase('turn_execution');
        this.generateTurnOrder();
        this.currentTurnIndex = 0;
        this.executeNextAction();
    }

    /**
     * 行動順を生成する（agility + 乱数0-9）
     */
    generateTurnOrder() {
        const allActions = [];
        
        // プレイヤーアクション
        this.playerActions.forEach(action => {
            if (action && action.actor.isAlive()) {
                const speed = action.actor.agility + Math.floor(Math.random() * 10);
                allActions.push({
                    ...action,
                    speed: speed
                });
            }
        });

        // 敵のアクション（AI）
        this.enemyParty.forEach(enemy => {
            if (enemy.isAlive()) {
                const action = enemy.generateAction(this.playerParty);
                const speed = enemy.agility + Math.floor(Math.random() * 10);
                allActions.push({
                    ...action,
                    speed: speed
                });
            }
        });

        // 速度順でソート（降順）
        this.turnOrder = allActions.sort((a, b) => b.speed - a.speed);
    }


    /**
     * 次の行動を実行する
     */
    executeNextAction() {
        if (this.currentTurnIndex >= this.turnOrder.length) {
            // 全員の行動が完了、次のターンへ
            this.startPlayerActionSelection();
            return;
        }

        const currentAction = this.turnOrder[this.currentTurnIndex];
        this.executeAction(currentAction);
    }

    /**
     * 行動を実行する
     * @param {Object} action - 実行する行動
     */
    executeAction(action) {
        if (!action.actor.isAlive()) {
            this.currentTurnIndex++;
            this.executeNextAction();
            return;
        }

        switch (action.type) {
            case 'fight':
                this.executeFightAction(action);
                break;
            case 'defend':
                this.executeDefendAction(action);
                break;
            case 'magic':
                this.executeMagicAction(action);
                break;
            case 'item':
                this.executeItemAction(action);
                break;
            case 'enemy_action':
                this.executeEnemyAction(action);
                break;
            default:
                console.warn(`不明な行動タイプ: ${action.type}`);
                this.currentTurnIndex++;
                this.executeNextAction();
                break;
        }
    }

    /**
     * 攻撃アクションを実行する
     * @param {Object} action - 攻撃行動
     */
    executeFightAction(action) {
        // ActionResolverを使用して攻撃を解決
        const result = this.actionResolver.resolveAction(action);
        
        if (result.success) {
            // MessageManagerを使ってメッセージを構築
            const message = this.messageManager.buildAttackMessage(
                result, 
                action.actor.name, 
                action.target.name
            );
            this.showMessageAndWait(message);
            
            // 効果を適用（ダメージ等）
            if (result.effects && result.effects.length > 0) {
                this.applyActionEffects(result.effects);
            }
        } else {
            this.showMessageAndWait(result.message || this.messageManager.buildErrorMessage('action_failed', { actor: action.actor, actionName: '攻撃' }));
        }

        setTimeout(() => {
            const battleResult = this.checkBattleResult();
            if (battleResult) {
                this.endBattle(battleResult);
            } else {
                this.currentTurnIndex++;
                this.executeNextAction();
            }
        }, 2000);
    }

    /**
     * 防御アクションを実行する
     * @param {Object} action - 防御行動
     */
    executeDefendAction(action) {
        // MessageManagerで防御メッセージを構築  
        const defendMessage = this.messageManager.buildMessage({
            success: true,
            effects: [{ type: 'defend', target: action.actor }]
        });
        this.showMessageAndWait(defendMessage);
        
        setTimeout(() => {
            this.currentTurnIndex++;
            this.executeNextAction();
        }, 1500);
    }

    /**
     * 魔法アクションを実行する
     * @param {Object} action - 魔法行動
     */
    executeMagicAction(action) {
        // ActionResolverを使用して魔法を解決
        const result = this.actionResolver.resolveAction(action);
        
        if (result.success) {
            // MessageManagerを使用してメッセージを構築
            const magicId = action.params.spellId;
            const spellData = this.inventories[magicId];
            if (!spellData) {
                throw new Exception('魔法データが見つかりませんでした:', { magicId, action });
            }
            
            // actionオブジェクトの詳細分析
            const actionKeys = Object.keys(action);
            const actionAnalysis = {};
            actionKeys.forEach(key => {
                actionAnalysis[key] = action[key];
            });
            
            // console.log('魔法アクションデバッグ:', {
            //     'action全体': action,
            //     'actionのキー': actionKeys,
            //     'action.params': action.params,
            //     'paramsのキー': action.params ? Object.keys(action.params) : 'paramsなし',
            //     'params詳細': action.params,
            //     'params.itemId': action.params?.itemId,
            //     'params.spellId': action.params?.spellId,
            //     'params.id': action.params?.id,
            //     actionType: action.type,
            //     spellId: action.spellId,
            //     itemId: action.itemId,
            //     magicId: magicId,
            //     spellData: spellData,
            //     spellType: spellData?.type
            // });
            
            const message = this.messageManager.buildMagicMessage(
                result,
                action.actor.name,
                spellData.name
            );
            this.showMessageAndWait(message);
            
            // 効果を適用（回復、MP消費等）
            if (result.effects && result.effects.length > 0) {
                this.applyActionEffects(result.effects);
            }
        } else {
            // 失敗時のメッセージを表示
            this.showMessageAndWait(result.message || this.messageManager.buildErrorMessage('action_failed', { actor: action.actor, actionName: '魔法' }));
        }
        
        setTimeout(() => {
            this.currentTurnIndex++;
            this.executeNextAction();
        }, 2000);
    }

    /**
     * アイテムアクションを実行する
     * @param {Object} action - アイテム使用行動
     */
    executeItemAction(action) {
        // console.log('アイテムアクション実行:', action);
        
        // ActionResolverを使用してアイテム使用を解決
        const result = this.actionResolver.resolveAction(action);
        
        // console.log('アイテムアクション結果:', result);
        
        if (result.success) {
            // MessageManagerを使用してメッセージを構築
            const inventoriesArray = Array.isArray(this.inventories) ? this.inventories : Object.values(this.inventories);
            const itemData = inventoriesArray.find(item => item.id === action.itemId);
            const message = this.messageManager.buildItemMessage(
                result,
                action.actor.name,
                itemData ? itemData.name : action.itemId,
                itemData
            );
            this.showMessageAndWait(message);
            
            // 効果を適用（回復効果など）
            if (result.effects && result.effects.length > 0) {
                this.applyActionEffects(result.effects);
            }
            
            // UIUpdateCallback経由でパーティステータスを更新
            if (this.uiUpdateCallback) {
                this.uiUpdateCallback('party_status_update', {
                    playerParty: this.playerParty.map(player => player.getStatus())
                });
            }
        } else {
            // 失敗時のメッセージを表示
            this.showMessageAndWait(result.message);
        }
        
        setTimeout(() => {
            this.currentTurnIndex++;
            this.executeNextAction();
        }, TurnBasedBattleRule.MESSAGE_COMPLETION_WAIT_TIME);
    }

    /**
     * アクション効果を適用する
     * @param {Array} effects - 適用する効果の配列
     */
    applyActionEffects(effects) {
        if (!effects || effects.length === 0) {
            return;
        }

        // console.log('効果適用開始:', effects);

        for (const effect of effects) {
            // console.log('効果適用:', effect);
            
            switch (effect.type) {
                case 'heal':
                case 'item_heal':
                case 'magic_heal':
                    if (effect.target) {
                        // effect.targetの型とhealメソッドの存在を確認
                        // console.log('回復効果対象:', { 
                        //     name: effect.target.name, 
                        //     id: effect.target.id,
                        //     hasHealMethod: typeof effect.target.heal === 'function',
                        //     targetType: effect.target.constructor.name,
                        //     currentHp: effect.target.currentHp
                        // });
                        
                        // 正しいパーティメンバーを特定
                        const actualPartyMember = this.playerParty.find(p => p.id === effect.target.id);
                        if (!actualPartyMember) {
                            console.error('パーティメンバーが見つかりません:', effect.target.name);
                            break;
                        }
                        
                        // amount または baseHeal プロパティから回復量を取得
                        const healAmount = effect.amount || effect.baseHeal || 0;
                        if (typeof healAmount === 'number' && healAmount > 0) {
                            // 正しいパーティメンバーのActorインスタンスに回復適用
                            if (typeof actualPartyMember.heal === 'function') {
                                actualPartyMember.heal(healAmount);
                            } else {
                                // healメソッドがない場合は直接HP回復
                                actualPartyMember.currentHp = Math.min(actualPartyMember.maxHp, actualPartyMember.currentHp + healAmount);
                            }
                            
                            // 回復後即座にパーティステータス表示を更新
                            if (this.uiUpdateCallback) {
                                this.uiUpdateCallback('party_status_update', {
                                    playerParty: this.playerParty
                                });
                            }
                        } else {
                            console.error('回復量が無効:', { amount: effect.amount, baseHeal: effect.baseHeal });
                        }
                    } else {
                        console.error('回復対象が無効:', effect);
                    }
                    break;
                    
                case 'damage':
                    if (effect.target && typeof effect.amount === 'number') {
                        effect.target.takeDamage(effect.amount);
                        
                        // ダメージ後即座にステータス表示を更新
                        if (this.uiUpdateCallback) {
                            // プレイヤーへのダメージの場合はパーティステータス更新
                            const isPlayerTarget = this.playerParty.some(p => p.id === effect.target.id);
                            if (isPlayerTarget) {
                                this.uiUpdateCallback('party_status_update', {
                                    playerParty: this.playerParty
                                });
                            } else {
                                // 敵へのダメージの場合は敵ステータス更新
                                this.uiUpdateCallback('enemy_status_update', {
                                    enemyParty: this.enemyParty
                                });
                            }
                        }
                    }
                    break;
                    
                case 'mp_restore':
                    if (effect.target && typeof effect.amount === 'number') {
                        effect.target.currentMp = Math.min(effect.target.maxMp, effect.target.currentMp + effect.amount);
                        
                        // MP回復後即座にステータス表示を更新
                        if (this.uiUpdateCallback) {
                            const isPlayerTarget = this.playerParty.some(p => p.id === effect.target.id);
                            if (isPlayerTarget) {
                                this.uiUpdateCallback('party_status_update', {
                                    playerParty: this.playerParty
                                });
                            } else {
                                this.uiUpdateCallback('enemy_status_update', {
                                    enemyParty: this.enemyParty
                                });
                            }
                        }
                    }
                    break;
                    
                case 'mp_consume':
                    if (effect.target && typeof effect.amount === 'number') {
                        effect.target.currentMp = Math.max(0, effect.target.currentMp - effect.amount);
                        
                        // MP消費後即座にステータス表示を更新
                        if (this.uiUpdateCallback) {
                            const isPlayerTarget = this.playerParty.some(p => p.id === effect.target.id);
                            if (isPlayerTarget) {
                                this.uiUpdateCallback('party_status_update', {
                                    playerParty: this.playerParty
                                });
                            } else {
                                this.uiUpdateCallback('enemy_status_update', {
                                    enemyParty: this.enemyParty
                                });
                            }
                        }
                    }
                    break;
                    
                case 'item_consume':
                    if (effect.target && effect.itemId && typeof effect.amount === 'number') {
                        // アイテム消費処理
                        if (effect.target.consumeItem && typeof effect.target.consumeItem === 'function') {
                            effect.target.consumeItem(effect.itemId, effect.amount);
                        } else {
                            console.error('アイテム消費メソッドが利用できません:', effect.target);
                        }
                    } else {
                        console.error('アイテム消費効果の設定が不正です:', effect);
                    }
                    break;
                    
                case 'defeat':
                    // 対象が倒された際の処理（特別な処理は不要、状態更新のみ）
                    // UI更新は既に親メソッドで実行されるため、特別な処理は不要
                    break;
                    
                case 'attack':
                    // 攻撃効果（ActionResolverでダメージ効果に変換されることが多い）
                    // 通常はdamage効果として処理されるため、特別な処理は不要
                    break;
                    
                case 'magic_damage':
                    // 魔法ダメージ（damageと同様の処理）
                    if (effect.target && typeof effect.amount === 'number') {
                        effect.target.takeDamage(effect.amount);
                        
                        // 魔法ダメージ後即座にステータス表示を更新
                        if (this.uiUpdateCallback) {
                            const isPlayerTarget = this.playerParty.some(p => p.id === effect.target.id);
                            if (isPlayerTarget) {
                                this.uiUpdateCallback('party_status_update', {
                                    playerParty: this.playerParty
                                });
                            } else {
                                this.uiUpdateCallback('enemy_status_update', {
                                    enemyParty: this.enemyParty
                                });
                            }
                        }
                    }
                    break;
                    
                case 'defend':
                    // 防御効果（特別な処理は不要）
                    break;
                    
                case 'attack_buff':
                    if (effect.target && typeof effect.multiplier === 'number' && typeof effect.duration === 'number') {
                        // 正しいパーティメンバーを特定
                        const actualTarget = this.playerParty.find(p => p.id === effect.target.id) || 
                                           this.enemyParty.find(e => e.id === effect.target.id);
                        
                        if (!actualTarget) {
                            console.error('攻撃力バフ対象が見つかりません:', effect.target.name);
                            break;
                        }
                        
                        // 正しいActorインスタンスに攻撃力バフを適用
                        if (typeof actualTarget.setAttackBuff === 'function') {
                            actualTarget.setAttackBuff(effect.multiplier, effect.duration);
                        } else {
                            console.error('setAttackBuffメソッドが利用できません:', actualTarget);
                            break;
                        }
                        
                        // バフ適用後即座にステータス表示を更新
                        if (this.uiUpdateCallback) {
                            const isPlayerTarget = this.playerParty.some(p => p.id === effect.target.id);
                            if (isPlayerTarget) {
                                this.uiUpdateCallback('party_status_update', {
                                    playerParty: this.playerParty
                                });
                            } else {
                                this.uiUpdateCallback('enemy_status_update', {
                                    enemyParty: this.enemyParty
                                });
                            }
                        }
                    } else {
                        console.error('攻撃力バフ効果の設定が不正です:', effect);
                    }
                    break;
                    
                default:
                    console.error('未対応の効果タイプ:', effect.type);
                    break;
            }
        }
    }
    
    /**
     * 敵のアクション（enemy_action）を実行する（統一処理版）
     * @param {Object} action - 敵のアクション
     */
    executeEnemyAction(action) {
        // ActionResolverを使用してアクションを解決
        const result = this.actionResolver.resolveAction(action);
        
        if (result.success) {
            // MessageManagerを使ってメッセージを構築
            const message = this.messageManager.buildEnemyActionMessage(
                result,
                action.actor.name,
                result.actionData?.action?.name || 'アクション'
            );
            this.showMessageAndWait(message);
            
            // 効果を適用（ダメージ等）
            if (result.effects && result.effects.length > 0) {
                this.applyActionEffects(result.effects);
            }
        } else {
            console.warn("アクション失敗", result);
            this.showMessageAndWait(this.messageManager.buildErrorMessage('action_failed', { actor: action.actor, actionName: 'アクション' }));
        }
        
        // 勝敗判定
        const battleResult = this.checkBattleResult();
        if (battleResult) {
            this.endBattle(battleResult);
            return;
        }
        
        setTimeout(() => {
            this.currentTurnIndex++;
            this.executeNextAction();
        }, 2000);
    }


    /**
     * 敵のターンを実行する（先攻時）
     */
    executeEnemyTurn() {
        this.generateEnemyTurnOrder();
        this.executeEnemyActions();
    }

    /**
     * 敵の行動順を生成する
     */
    generateEnemyTurnOrder() {
        this.turnOrder = this.enemyParty
            .filter(enemy => enemy.isAlive())
            .map(enemy => {
                const action = enemy.generateAction(this.playerParty);
                const speed = enemy.agility + Math.floor(Math.random() * 10);
                return {
                    ...action,
                    speed: speed
                };
            })
            .sort((a, b) => b.speed - a.speed);
    }

    /**
     * 敵のアクションを順次実行する
     */
    executeEnemyActions() {
        if (this.turnOrder.length === 0) {
            // 敵のターン終了、プレイヤーターンへ
            this.startPlayerActionSelection();
            return;
        }

        const action = this.turnOrder.shift();
        this.executeAction(action);
    }

    /**
     * 勝敗判定を行う
     * @returns {string|null} 'victory', 'defeat', または null
     */
    checkBattleResult() {
        const aliveEnemies = this.enemyParty.filter(e => e.isAlive());
        const alivePlayers = this.playerParty.filter(p => p.isAlive());

        if (aliveEnemies.length === 0) {
            return 'victory';
        } else if (alivePlayers.length === 0) {
            return 'defeat';
        }
        
        return null;
    }

    /**
     * バトルを終了する
     * @param {string} result - 'victory' or 'defeat'
     */
    endBattle(result) {
        this.setPhase('battle_end');
        
        // MessageManagerでバトル結果メッセージを構築
        const resultMessage = this.messageManager.buildBattleStatusMessage('battle_end', {
            victory: result === 'victory'
        });
        this.showMessageAndWait(resultMessage);

        // UI更新: 再プレイボタンを表示
        if (this.uiUpdateCallback) {
            this.uiUpdateCallback('battle_end', { result: result });
        }
    }

    /**
     * バトルをリスタートする
     */
    async restartBattle() {
        this.initializeBattle();
        await this.startBattle();
    }

    /**
     * メッセージを表示する（タイプライター処理完了またはスキップで即座に終了）
     * @param {string} message - 表示メッセージ
     * @returns {Promise} メッセージ表示完了を示すPromise
     */
    async showMessage(message) {
        if (this.messageCallback) {
            // MessageDisplayにメッセージを送信し、そのPromiseを取得
            const messageDisplay = document.querySelector('message-display');
            if (messageDisplay) {
                // MessageDisplayのaddMessageは内部でタイプライター効果とスキップ機能を処理
                await messageDisplay.addMessage(message);
            } else {
                // MessageDisplayが見つからない場合はフォールバック
                this.messageCallback(message);
            }
        }
    }

    /**
     * メッセージを表示し、完了後に待機する
     * @param {string} message - 表示メッセージ
     * @param {number} waitTime - 待機時間（ミリ秒、デフォルトは定数値）
     * @returns {Promise} 全処理完了を示すPromise
     */
    async showMessageAndWait(message, waitTime = TurnBasedBattleRule.MESSAGE_COMPLETION_WAIT_TIME) {
        await this.showMessage(message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    /**
     * 生存している指定インデックスのプレイヤーを取得
     * @param {number} index - インデックス
     * @returns {Object|null} プレイヤーオブジェクト
     */
    getAlivePlayerByIndex(index) {
        const alivePlayers = this.playerParty.filter(p => p.isAlive());
        return alivePlayers[index] || null;
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnBasedBattleRule;
} else {
    window.TurnBasedBattleRule = TurnBasedBattleRule;
}