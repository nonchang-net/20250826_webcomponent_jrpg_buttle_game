/**
 * バトルシーン表示管理クラス
 * バトル画面のUI表示とレンダリングを担当する
 * 
 * デバッグ用ログ:
 * - updateUIInteractionState()メソッド内にデバッグ用コードが含まれています
 * - 必要に応じてコメントブロックを解除してデバッグに活用してください
 */
class BattleSceneDisplay {
    constructor(battleScene) {
        this.battleScene = battleScene;
        this.enemyDisplay = null;
        this.partyStatus = null;
        this.commandMenu = null;
        this.messageDisplay = null;
    }

    /**
     * バトルフィールドのHTML構造を設定する
     * @returns {string} HTML文字列
     */
    setupBattleFieldHTML() {
        return `
            <style>
                :host {
                    display: block;
                    width: 100vw;
                    height: 100vh;
                    background: linear-gradient(180deg, #2B4C8C 0%, #1A2F5C 50%, #0F1929 100%);
                    position: relative;
                    font-family: 'MS UI Gothic', 'Hiragino Kaku Gothic Pro', sans-serif;
                }

                .battle-field {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .enemy-area {
                    flex: 1;
                }

                .ui-area {
                    height: 250px;
                    background: linear-gradient(180deg, #1a1a1a 0%, #333333 100%);
                    border-top: 3px solid #FFD700;
                    display: flex;
                    position: relative;
                }
            </style>
            
            <div class="battle-field">
                <div class="enemy-area">
                    <enemy-display id="enemy-display"></enemy-display>
                </div>
                
                <div class="ui-area">
                    <party-status id="party-status"></party-status>
                    <command-menu id="command-menu"></command-menu>
                </div>
                
                <message-display id="message-display"></message-display>
            </div>
        `;
    }

    /**
     * 子コンポーネントの参照を初期化する
     * @param {HTMLElement} hostElement - ホスト要素
     */
    initializeComponentReferences(hostElement) {
        this.enemyDisplay = hostElement.querySelector('#enemy-display');
        this.partyStatus = hostElement.querySelector('#party-status');
        this.commandMenu = hostElement.querySelector('#command-menu');
        this.messageDisplay = hostElement.querySelector('#message-display');
        
        // MessageDisplayの状態変更コールバックを設定
        if (this.messageDisplay) {
            this.messageDisplay.setOnStateChangeCallback(() => {
                this.updateUIInteractionState();
            });
        }
    }

    /**
     * 画面を描画する
     * プレイヤーパーティと敵パーティの情報を子コンポーネントに設定する
     * @param {Array} playerParty - プレイヤーパーティ
     * @param {Array} enemyParty - 敵パーティ
     */
    render(playerParty, enemyParty) {
        if (this.enemyDisplay) {
            this.enemyDisplay.setEnemies(enemyParty);
        }
        if (this.partyStatus) {
            this.partyStatus.setPartyMembers(playerParty);
        }
    }

    /**
     * バトルシステムからのUI更新を処理する
     * @param {string} type - 更新タイプ
     * @param {Object} data - 更新データ
     * @param {Array} playerParty - プレイヤーパーティ
     * @param {Array} enemyParty - 敵パーティ
     */
    handleBattleUIUpdate(type, data, playerParty, enemyParty) {
        // console.log('BattleSceneDisplay: UI更新受信:', type, data); // DEBUG
        
        switch (type) {
            case 'player_selection':
                // プレイヤー行動選択フェーズ
                // console.log('プレイヤー選択UI更新:', data.currentPlayer ? data.currentPlayer.name : 'null'); // DEBUG
                // ここではメッセージを重複追加しない（TurnBasedBattleRuleで既に表示済み）
                break;
            
            case 'battle_end':
                // バトル終了
                // console.log('バトル終了UI更新:', data.result); // DEBUG
                this.handleBattleEnd(data.result);
                break;
            
            default:
                // console.log('Battle UI Update:', type, data); // DEBUG
                break;
        }
        
        // パーティ状態と敵表示を更新
        this.updatePartyAndEnemyDisplay(playerParty, enemyParty);
    }

    /**
     * パーティ状態と敵表示を更新する
     * @param {Array} playerParty - プレイヤーパーティ
     * @param {Array} enemyParty - 敵パーティ
     */
    updatePartyAndEnemyDisplay(playerParty, enemyParty) {
        if (this.partyStatus) {
            this.partyStatus.setPartyMembers(playerParty);
        }
        
        if (this.enemyDisplay) {
            this.enemyDisplay.setEnemies(enemyParty);
        }
    }

    /**
     * バトル終了処理
     * @param {string} result - 'victory' or 'defeat'
     */
    handleBattleEnd(result) {
        // 少し待ってから再プレイメニューを表示
        setTimeout(() => {
            if (this.commandMenu) {
                this.commandMenu.showReplayMenu();
            }
        }, 2000);
    }

    /**
     * UI操作が可能な状態かどうかを取得
     * メッセージ表示中やバトル状態を考慮してUI操作の可否を判定する
     * @returns {boolean} UI操作可能な場合true
     */
    isUIInteractionAllowed() {
        // メッセージ表示中は操作不可
        if (this.messageDisplay && !this.messageDisplay.isUIInteractionAllowed()) {
            return false;
        }
        
        // バトルシーンからバトル状態を取得
        if (this.battleScene && this.battleScene.battleFlowController) {
            const battleState = this.battleScene.battleFlowController.getBattleState();
            const currentPhase = battleState.state.phase;
            
            // プレイヤー選択フェーズまたはバトル終了時のみ操作可能
            return currentPhase === 'player_selection' || currentPhase === 'battle_end';
        }
        
        return false;
    }

    /**
     * コマンドメニューの表示状態を管理する
     * @param {boolean} visible - 表示するかどうか
     */
    setCommandMenuVisibility(visible) {
        if (this.commandMenu) {
            this.commandMenu.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * 敵キャラクターのクリック無効化状態を管理する
     * @param {boolean} disabled - 無効化するかどうか
     */
    setEnemyClickDisabled(disabled) {
        if (this.enemyDisplay) {
            this.enemyDisplay.setClickDisabled(disabled);
        }
    }

    /**
     * パーティメンバーのクリック無効化状態を管理する
     * @param {boolean} disabled - 無効化するかどうか
     */
    setPartyClickDisabled(disabled) {
        if (this.partyStatus) {
            this.partyStatus.setClickDisabled(disabled);
        }
    }

    /**
     * UI操作抑制状態を更新する
     */
    updateUIInteractionState() {
        const interactionAllowed = this.isUIInteractionAllowed();
        
        // デバッグ用ログ（必要に応じてコメントアウト解除）
        /*
        console.log('UI操作状態更新:', {
            interactionAllowed: interactionAllowed,
            messageDisplayAllowed: this.messageDisplay ? this.messageDisplay.isUIInteractionAllowed() : 'N/A',
            messageIsDisplaying: this.messageDisplay ? this.messageDisplay.getIsDisplaying() : 'N/A',
            messageQueueEmpty: this.messageDisplay ? this.messageDisplay.getIsQueueEmpty() : 'N/A'
        });
        */
        
        // コマンドメニューの表示/非表示
        if (this.battleScene && this.battleScene.battleFlowController) {
            const battleState = this.battleScene.battleFlowController.getBattleState();
            const currentPhase = battleState.state.phase;
            
            // プレイヤー選択フェーズまたはバトル終了時のみコマンドメニューを表示
            const showCommandMenu = (currentPhase === 'player_selection' || currentPhase === 'battle_end') && interactionAllowed;
            /*
            console.log('コマンドメニュー状態:', {
                currentPhase: currentPhase,
                showCommandMenu: showCommandMenu,
                battleState: battleState.state
            });
            */
            this.setCommandMenuVisibility(showCommandMenu);
        } else {
            // console.log('BattleFlowController が利用できない'); // DEBUG
        }
        
        // 敵とパーティメンバーのクリック無効化
        this.setEnemyClickDisabled(!interactionAllowed);
        this.setPartyClickDisabled(!interactionAllowed);
    }

    // 古いテスト用メソッド - performAttackAnimation は削除済み
    // バトルメッセージは全てMessageManager経由で統一的に処理される
}