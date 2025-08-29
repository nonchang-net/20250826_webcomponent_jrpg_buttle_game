/**
 * ターゲット選択コンポーネント
 * 道具や魔法使用時に対象となるキャラクターを選択するUI
 */
class TargetSelector extends HTMLElement {
    constructor() {
        super();
        this.targets = [];
        this.targetType = 'friend'; // 'friend' or 'enemy'
        this.onTargetSelected = null;
        this.onCancel = null;
        this.selectedIndex = 0;
        this.setupComponent();
        this.setupKeyboardHandler();
    }

    /**
     * コンポーネントの初期設定
     */
    setupComponent() {
        this.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .target-selector {
                    background: linear-gradient(135deg, #1e3c72, #2a5298);
                    border: 2px solid #fff;
                    border-radius: 10px;
                    padding: 20px;
                    max-width: 400px;
                    width: 90%;
                    color: white;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                }

                .selector-title {
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #FFD700;
                }

                .target-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .target-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 10px 15px;
                    border-radius: 5px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .target-item:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: #4CAF50;
                }

                .target-item.selected {
                    background: rgba(76, 175, 80, 0.3);
                    border-color: #4CAF50;
                    box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
                }

                .target-item.defeated {
                    opacity: 0.5;
                    background: rgba(255, 107, 107, 0.2);
                    border-color: #FF6B6B;
                }

                .target-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .target-name {
                    font-weight: bold;
                    font-size: 16px;
                }

                .target-status {
                    font-size: 12px;
                    color: #B0B0B0;
                }

                .target-hp {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                }

                .hp-bar {
                    width: 60px;
                    height: 6px;
                    background: rgba(0,0,0,0.5);
                    border-radius: 3px;
                    overflow: hidden;
                    border: 1px solid #666;
                }

                .hp-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #FF6B6B, #4CAF50);
                    transition: width 0.3s ease;
                }

                .controls {
                    margin-top: 15px;
                    text-align: center;
                    font-size: 12px;
                    color: #B0B0B0;
                }

                .control-hint {
                    margin-bottom: 5px;
                }

                .cancel-hint {
                    color: #FFD700;
                }
            </style>
            
            <div class="target-selector">
                <div class="selector-title" id="selector-title">対象を選択してください</div>
                <div class="target-list" id="target-list">
                    <!-- ターゲット一覧がここに表示される -->
                </div>
                <div class="controls">
                    <div class="control-hint">↑↓キー: 選択  Enter: 決定</div>
                    <div class="cancel-hint">Esc: キャンセル</div>
                </div>
            </div>
        `;
    }

    /**
     * キーボード操作を設定する
     */
    setupKeyboardHandler() {
        this.keydownHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();

            switch (event.key) {
                case 'ArrowUp':
                    this.moveSelection(-1);
                    break;
                case 'ArrowDown':
                    this.moveSelection(1);
                    break;
                case 'Enter':
                    this.confirmSelection();
                    break;
                case 'Escape':
                    this.cancelSelection();
                    break;
            }
        };
    }

    /**
     * ターゲット選択を表示する
     * @param {Array} targets - ターゲット候補の配列
     * @param {string} targetType - 'friend' または 'enemy'
     * @param {string} title - 選択画面のタイトル
     * @param {Function} onSelect - 選択時のコールバック
     * @param {Function} onCancel - キャンセル時のコールバック
     */
    show(targets, targetType = 'friend', title = '対象を選択してください', onSelect = null, onCancel = null) {
        this.targets = targets || [];
        this.targetType = targetType;
        this.onTargetSelected = onSelect;
        this.onCancel = onCancel;
        this.selectedIndex = 0;

        // タイトルを設定
        const titleElement = this.querySelector('#selector-title');
        titleElement.textContent = title;

        // ターゲット一覧を描画
        this.renderTargets();

        // キーボードイベントリスナーを追加
        document.addEventListener('keydown', this.keydownHandler);

        // 表示
        this.style.display = 'flex';
    }

    /**
     * ターゲット選択を隠す
     */
    hide() {
        this.style.display = 'none';
        
        // キーボードイベントリスナーを削除
        document.removeEventListener('keydown', this.keydownHandler);
    }

    /**
     * ターゲット一覧を描画する
     */
    renderTargets() {
        const container = this.querySelector('#target-list');
        container.innerHTML = '';

        this.targets.forEach((target, index) => {
            const targetElement = document.createElement('div');
            targetElement.className = 'target-item';
            targetElement.dataset.index = index;
            
            // 選択状態の設定
            if (index === this.selectedIndex) {
                targetElement.classList.add('selected');
            }

            // 撃破状態の設定
            if (target.currentHp <= 0) {
                targetElement.classList.add('defeated');
            }

            // HP計算
            const hpPercentage = target.maxHp > 0 ? Math.floor((target.currentHp / target.maxHp) * 100) : 0;
            const statusText = target.currentHp <= 0 ? '撃破' : 
                              target.currentHp <= target.maxHp / 3 ? '重傷' : '元気';

            targetElement.innerHTML = `
                <div class="target-info">
                    <div class="target-name">${target.name}</div>
                    <div class="target-status">${statusText}</div>
                </div>
                <div class="target-hp">
                    <div class="hp-bar">
                        <div class="hp-fill" style="width: ${hpPercentage}%"></div>
                    </div>
                    <span>${target.currentHp}/${target.maxHp}</span>
                </div>
            `;

            // クリックイベント
            targetElement.addEventListener('click', () => {
                this.selectedIndex = index;
                this.renderTargets();
                this.confirmSelection();
            });

            container.appendChild(targetElement);
        });
    }

    /**
     * 選択位置を移動する
     * @param {number} direction - 移動方向（-1: 上, 1: 下）
     */
    moveSelection(direction) {
        const newIndex = this.selectedIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.targets.length) {
            this.selectedIndex = newIndex;
            this.renderTargets();
        }
    }

    /**
     * 選択を確定する
     */
    confirmSelection() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.targets.length) {
            const selectedTarget = this.targets[this.selectedIndex];
            
            if (this.onTargetSelected) {
                this.onTargetSelected(selectedTarget, this.selectedIndex);
            }
            
            this.hide();
        }
    }

    /**
     * 選択をキャンセルする
     */
    cancelSelection() {
        if (this.onCancel) {
            this.onCancel();
        }
        
        this.hide();
    }
}

// カスタム要素として登録
customElements.define('target-selector', TargetSelector);