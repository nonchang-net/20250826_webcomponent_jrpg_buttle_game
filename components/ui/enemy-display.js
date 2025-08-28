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
                    justify-content: center;
                    align-items: center;
                    padding: 50px;
                    flex: 1;
                }

                .enemy-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 30px;
                    justify-content: center;
                    padding : 2em;
                }

                .enemy {
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid #FFD700;
                    border-radius: 10px;
                    padding: 20px;
                    color: white;
                    text-align: center;
                    min-width: 120px;
                    backdrop-filter: blur(5px);
                    transition: all 0.3s ease;
                }

                .enemy-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }

                .enemy-hp {
                    font-size: 14px;
                    color: #90EE90;
                }

                .enemy-status {
                    font-size: 12px;
                    color: #FFD700;
                    margin-top: 5px;
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
                    opacity: 0.5;
                    filter: grayscale(100%);
                    pointer-events: none;
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
                <div class="enemy-hp">HP: ${enemy.currentHp}/${enemy.maxHp}</div>
                ${enemy.status ? `<div class="enemy-status">${enemy.status}</div>` : ''}
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