/**
 * バトルシーン表示管理クラス
 * バトル画面のUI表示とレンダリングを担当する
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
        switch (type) {
            case 'player_selection':
                // プレイヤー行動選択フェーズ
                if (data.currentPlayer && this.messageDisplay) {
                    this.messageDisplay.addMessage(`${data.currentPlayer.name}の行動を選択してください`);
                }
                break;
            
            case 'battle_end':
                // バトル終了
                this.handleBattleEnd(data.result);
                break;
            
            default:
                console.log('Battle UI Update:', type, data);
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
     * 攻撃アクションの視覚演出を実行する
     * @param {Array} enemyParty - 敵パーティ
     */
    performAttackAnimation(enemyParty) {
        // 最初の敵にダメージ演出
        if (enemyParty.length > 0 && this.enemyDisplay) {
            this.enemyDisplay.playDamageAnimation(0);
            
            // 攻撃メッセージを表示
            this.messageDisplay.showBattleEvent('attack', {
                attacker: '勇者',
                target: enemyParty[0].name,
                damage: 30
            });
            
            // サンプルダメージ処理
            setTimeout(() => {
                const currentHp = parseInt(enemyParty[0].currentHp || enemyParty[0].hp);
                const newHp = Math.max(0, currentHp - 30);
                this.enemyDisplay.updateEnemyHp(0, newHp);
                
                // 敵が倒れた場合のメッセージ
                if (newHp <= 0) {
                    this.messageDisplay.addMessage(`${enemyParty[0].name}を倒した！`);
                }
            }, 250);
        }
    }
}