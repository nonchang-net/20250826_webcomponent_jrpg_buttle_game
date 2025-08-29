/**
 * 選択UIの共通処理コンポーネント
 * コマンド、道具、魔法、ターゲット選択で使用する統一されたボタンUI
 */
class SelectionUI extends HTMLElement {
    constructor() {
        super();
        this.selectedIndex = 0;
        this.items = [];
        this.onItemSelected = null;
        this.onCancel = null;
        this.keydownHandler = null;
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
                    flex-direction: column;
                    gap: 8px;
                    flex: 1;
                }

                .selection-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex: 1;
                }

                .selection-button {
                    background: linear-gradient(145deg, #4a4a4a, #2a2a2a);
                    border: 2px solid #666;
                    color: white;
                    font-size: 14px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 12px;
                    min-height: 28px;
                    width: 100%;
                    box-sizing: border-box;
                    position: relative;
                }

                .selection-button.selected {
                    background: linear-gradient(145deg, #FFD700, #FFA000);
                    border-color: #FFD700;
                    color: #000;
                    transform: translateX(10px);
                }

                .selection-button.selected::before {
                    content: '▶';
                    position: absolute;
                    left: -15px;
                    color: #FFD700;
                    font-size: 12px;
                }

                .selection-button:hover:not(:disabled) {
                    background: linear-gradient(145deg, #5a5a5a, #3a3a3a);
                    border-color: #FFD700;
                    transform: translateY(-2px);
                }

                .selection-button:active:not(:disabled) {
                    transform: translateY(0);
                }

                .selection-button:disabled {
                    background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
                    border-color: #333;
                    color: #666;
                    cursor: not-allowed;
                }

                .selection-button.back-style {
                    background: linear-gradient(145deg, #666, #444);
                    border-color: #888;
                }

                .selection-button.back-style:hover:not(:disabled) {
                    background: linear-gradient(145deg, #777, #555);
                    border-color: #AAA;
                }

                .selection-button.back-style.selected {
                    background: linear-gradient(145deg, #888, #666);
                    border-color: #FFD700;
                    color: #FFD700;
                }

                .item-quantity {
                    color: #90EE90;
                    font-size: 12px;
                }

                .mp-cost {
                    color: #3498DB;
                    font-size: 12px;
                }

                .disabled-text {
                    color: #666;
                }
            </style>
            
            <div class="selection-list" id="selection-list">
                <!-- 選択肢がここに表示される -->
            </div>
        `;
    }

    /**
     * 選択UIを表示する
     * @param {Array} items - 選択項目の配列
     * @param {Function} onSelect - 選択時のコールバック
     * @param {Function} onCancel - キャンセル時のコールバック
     */
    show(items = [], onSelect = null, onCancel = null) {
        this.items = items;
        this.onItemSelected = onSelect;
        this.onCancel = onCancel;
        this.selectedIndex = 0;
        
        this.render();
        this.setupKeyboardHandler();
    }

    /**
     * 選択UIを隠す
     */
    hide() {
        this.removeKeyboardHandler();
    }

    /**
     * 選択項目を描画する
     */
    render() {
        const container = this.querySelector('#selection-list');
        container.innerHTML = '';

        this.items.forEach((item, index) => {
            const button = document.createElement('button');
            button.className = 'selection-button';
            button.dataset.index = index;
            
            // ボタンのスタイル設定
            if (item.isBackButton) {
                button.classList.add('back-style');
            }
            
            if (item.disabled) {
                button.disabled = true;
            }
            
            if (index === this.selectedIndex) {
                button.classList.add('selected');
            }

            // ボタン内容の設定
            const nameSpan = document.createElement('span');
            nameSpan.className = item.disabled ? 'disabled-text' : '';
            nameSpan.textContent = item.name;
            
            button.appendChild(nameSpan);
            
            // 追加情報の表示（数量、MP消費など）
            if (item.quantity !== undefined) {
                const quantitySpan = document.createElement('span');
                quantitySpan.className = 'item-quantity';
                quantitySpan.textContent = `×${item.quantity}`;
                button.appendChild(quantitySpan);
            } else if (item.mpCost !== undefined) {
                const mpSpan = document.createElement('span');
                mpSpan.className = 'mp-cost';
                mpSpan.textContent = `MP${item.mpCost}`;
                button.appendChild(mpSpan);
            }

            // クリックイベント
            button.addEventListener('click', () => {
                this.selectedIndex = index;
                this.render();
                this.executeSelection();
            });

            container.appendChild(button);
        });
    }

    /**
     * キーボード操作を設定する
     */
    setupKeyboardHandler() {
        this.keydownHandler = (event) => {
            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    this.moveSelection(-1);
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.moveSelection(1);
                    break;
                case 'Enter':
                    event.preventDefault();
                    this.executeSelection();
                    break;
                case 'Escape':
                    event.preventDefault();
                    if (this.onCancel) {
                        this.onCancel();
                    }
                    break;
            }
        };
        
        document.addEventListener('keydown', this.keydownHandler);
    }

    /**
     * キーボード操作を削除する
     */
    removeKeyboardHandler() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
    }

    /**
     * 選択を移動する
     * @param {number} direction - 移動方向（-1: 上, 1: 下）
     */
    moveSelection(direction) {
        if (this.items.length === 0) return;
        
        this.selectedIndex = (this.selectedIndex + direction + this.items.length) % this.items.length;
        this.render();
    }

    /**
     * 選択を実行する
     */
    executeSelection() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            const selectedItem = this.items[this.selectedIndex];
            
            if (this.onItemSelected) {
                this.onItemSelected(selectedItem, this.selectedIndex);
            }
        }
    }
}

// カスタム要素として登録
customElements.define('selection-ui', SelectionUI);