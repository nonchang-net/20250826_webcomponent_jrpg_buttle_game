/**
 * 敵表示コンポーネント
 * バトルシーンの敵キャラクターを表示する
 */
class EnemyDisplay extends HTMLElement {
    constructor() {
        super();
        this.enemies = [];
        this.setupComponent();
    }

    /**
     * コンポーネントの初期設定
     */
    setupComponent() {
        this.innerHTML = `
            <style>
                :host {
                    display: flex;
                    width: 100%;
                    height: 100%;
                    padding: 8px;
                    overflow: hidden;
                }

                .enemy-container {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    width: calc(100% - 20px);
                    height: calc(100% - 12px);
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                    padding: 6px;
                    overflow-y: auto;
                }

                .enemy {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 6px;
                    padding: 8px 10px;
                    color: white;
                    border-left: 4px solid #FF6B6B;
                    flex-shrink: 0;
                    min-height: 60px;
                }

                .enemy-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .enemy-name {
                    font-size: 14px;
                    font-weight: bold;
                }

                .enemy-status {
                    font-size: 11px;
                    color: #FFD700;
                }

                .enemy-stats {
                    display: flex;
                    flex-direction: row;
                    gap: 8px;
                    align-items: center;
                    justify-content: flex-start;
                }

                .enemy-hp {
                    font-size: 12px;
                    color: #90EE90;
                }

                @keyframes damage {
                    0% { transform: translateX(0) scale(1); }
                    25% { transform: translateX(-5px) scale(1.1); }
                    75% { transform: translateX(5px) scale(1.1); }
                    100% { transform: translateX(0) scale(1); }
                }

                .damage-animation {
                    animation: damage 0.5s ease-in-out;
                }

                .defeated {
                    opacity: 0.6;
                    filter: grayscale(100%);
                    pointer-events: none;
                    border-left-color: #666;
                }

            </style>
            
            <div class="enemy-container" id="enemy-container">
                <!-- 敵キャラクターがここに表示される -->
            </div>
        `;
    }

    /**
     * 敵データを設定する
     * @param {Array} enemies - 敵キャラクターの配列
     */
    setEnemies(enemies) {
        this.enemies = enemies;
        this.render();
    }

    /**
     * 敵を描画する
     */
    render() {
        const container = this.querySelector('#enemy-container');
        container.innerHTML = '';
        
        this.enemies.forEach((enemy, index) => {
            const enemyElement = document.createElement('div');
            enemyElement.className = 'enemy';
            enemyElement.dataset.enemyId = enemy.id;
            enemyElement.dataset.index = index;
            
            enemyElement.innerHTML = `
                <div class="enemy-name">${enemy.name}</div>
                <div class="enemy-stats">
                    <div class="enemy-hp">HP: ${enemy.currentHp}/${enemy.maxHp}</div>
                    ${enemy.status ? `<div class="enemy-status">${enemy.status}</div>` : ''}
                </div>
            `;
            
            // 敵が倒されている場合のスタイル適用
            if (enemy.currentHp <= 0) {
                enemyElement.classList.add('defeated');
            }
            
            
            container.appendChild(enemyElement);
        });
    }


    /**
     * ダメージアニメーションを実行する
     * @param {number} index - アニメーションを実行する敵のインデックス
     */
    playDamageAnimation(index) {
        const enemyElement = this.querySelector(`[data-index="${index}"]`);
        if (enemyElement) {
            enemyElement.classList.add('damage-animation');
            
            setTimeout(() => {
                enemyElement.classList.remove('damage-animation');
            }, 500);
        }
    }

    /**
     * 敵のHPを更新する
     * @param {number} index - 更新する敵のインデックス
     * @param {number} newHp - 新しいHP値
     */
    updateEnemyHp(index, newHp) {
        if (this.enemies[index]) {
            this.enemies[index].currentHp = Math.max(0, newHp);
            this.render();
        }
    }


}

// カスタム要素として登録
customElements.define('enemy-display', EnemyDisplay);