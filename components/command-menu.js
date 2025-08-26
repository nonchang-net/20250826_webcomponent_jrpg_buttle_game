/**
 * コマンドメニューコンポーネント
 * バトル中の操作コマンドを管理する
 */
class CommandMenu extends HTMLElement {
    constructor() {
        super();
        this.currentMode = 'main'; // 'main', 'target', 'item', 'magic'
        this.commands = [
            { id: 'attack', label: 'こうげき', enabled: true },
            { id: 'magic', label: 'じゅもん', enabled: true },
            { id: 'item', label: 'どうぐ', enabled: true },
            { id: 'escape', label: 'にげる', enabled: true }
        ];
        this.setupComponent();
    }

    /**
     * コンポーネントの初期設定
     */
    setupComponent() {
        this.innerHTML = `
            <style>
                :host {
                    flex: 1;
                    padding: 20px;
                    background: rgba(0,0,0,0.3);
                    border-left: 2px solid #444;
                    display: flex;
                    flex-direction: column;
                }

                .menu-title {
                    color: #FFD700;
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-align: center;
                    border-bottom: 1px solid #666;
                    padding-bottom: 5px;
                }

                .command-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    flex: 1;
                }

                .command-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex: 1;
                }

                .command-button {
                    background: linear-gradient(145deg, #4a4a4a, #2a2a2a);
                    border: 2px solid #666;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                    min-height: 45px;
                }

                .command-button:hover:not(:disabled) {
                    background: linear-gradient(145deg, #5a5a5a, #3a3a3a);
                    border-color: #FFD700;
                    transform: translateY(-2px);
                }

                .command-button:active:not(:disabled) {
                    transform: translateY(0);
                }

                .command-button:disabled {
                    background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
                    border-color: #333;
                    color: #666;
                    cursor: not-allowed;
                }

                .command-button.selected {
                    border-color: #FFD700;
                    background: linear-gradient(145deg, #FFD700, #FFA000);
                    color: #000;
                }

                .back-button {
                    background: linear-gradient(145deg, #666, #444);
                    border: 2px solid #888;
                    margin-top: 10px;
                }

                .back-button:hover {
                    background: linear-gradient(145deg, #777, #555);
                    border-color: #AAA;
                }

                .target-instruction {
                    color: #FFD700;
                    font-size: 12px;
                    text-align: center;
                    margin-bottom: 10px;
                    padding: 5px;
                    background: rgba(255, 215, 0, 0.1);
                    border-radius: 4px;
                }

                .item-list, .magic-list {
                    max-height: 120px;
                    overflow-y: auto;
                    border: 1px solid #666;
                    border-radius: 4px;
                    background: rgba(0,0,0,0.5);
                }

                .item-button, .magic-button {
                    width: 100%;
                    text-align: left;
                    padding: 8px 12px;
                    font-size: 14px;
                    min-height: auto;
                    border: none;
                    border-bottom: 1px solid #333;
                    border-radius: 0;
                    background: transparent;
                    color: white;
                }

                .item-button:hover, .magic-button:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: none;
                }

                .item-button:last-child, .magic-button:last-child {
                    border-bottom: none;
                }

                .mp-cost {
                    color: #3498DB;
                    font-size: 12px;
                    float: right;
                }

                .item-quantity {
                    color: #90EE90;
                    font-size: 12px;
                    float: right;
                }

                .disabled-text {
                    color: #666;
                }
            </style>
            
            <div class="menu-title" id="menu-title">コマンド選択</div>
            <div id="menu-content">
                <!-- メニューコンテンツがここに表示される -->
            </div>
        `;
        
        this.showMainMenu();
    }

    /**
     * メインコマンドメニューを表示する
     */
    showMainMenu() {
        this.currentMode = 'main';
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = 'コマンド選択';
        
        contentElement.innerHTML = `
            <div class="command-grid">
                ${this.commands.map(command => `
                    <button class="command-button" 
                            data-command="${command.id}"
                            ${!command.enabled ? 'disabled' : ''}
                            onclick="this.getRootNode().host.handleCommand('${command.id}')">
                        ${command.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    /**
     * ターゲット選択モードを表示する
     */
    showTargetSelection() {
        this.currentMode = 'target';
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = 'ターゲット選択';
        
        contentElement.innerHTML = `
            <div class="target-instruction">
                攻撃対象を選択してください
            </div>
            <div class="command-list">
                <button class="back-button command-button" onclick="this.getRootNode().host.showMainMenu()">
                    戻る
                </button>
            </div>
        `;
    }

    /**
     * アイテムメニューを表示する
     * @param {Array} items - 使用可能なアイテムリスト
     */
    showItemMenu(items = []) {
        this.currentMode = 'item';
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = 'どうぐ選択';
        
        const itemList = items.length > 0 ? items.map(item => `
            <button class="item-button command-button" 
                    data-item="${item.id}"
                    onclick="this.getRootNode().host.useItem('${item.id}')">
                ${item.name}
                <span class="item-quantity">×${item.quantity}</span>
            </button>
        `).join('') : '<div style="color: #666; text-align: center; padding: 20px;">使用できるアイテムがありません</div>';
        
        contentElement.innerHTML = `
            <div class="command-list">
                <div class="item-list">
                    ${itemList}
                </div>
                <button class="back-button command-button" onclick="this.getRootNode().host.showMainMenu()">
                    戻る
                </button>
            </div>
        `;
    }

    /**
     * 魔法メニューを表示する
     * @param {Array} spells - 使用可能な魔法リスト
     */
    showMagicMenu(spells = []) {
        this.currentMode = 'magic';
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = 'じゅもん選択';
        
        const spellList = spells.length > 0 ? spells.map(spell => `
            <button class="magic-button command-button" 
                    data-spell="${spell.id}"
                    ${spell.mpCost > spell.availableMp ? 'disabled' : ''}
                    onclick="this.getRootNode().host.useMagic('${spell.id}')">
                <span class="${spell.mpCost > spell.availableMp ? 'disabled-text' : ''}">${spell.name}</span>
                <span class="mp-cost">MP${spell.mpCost}</span>
            </button>
        `).join('') : '<div style="color: #666; text-align: center; padding: 20px;">使用できる呪文がありません</div>';
        
        contentElement.innerHTML = `
            <div class="command-list">
                <div class="magic-list">
                    ${spellList}
                </div>
                <button class="back-button command-button" onclick="this.getRootNode().host.showMainMenu()">
                    戻る
                </button>
            </div>
        `;
    }

    /**
     * コマンドの有効/無効を設定する
     * @param {string} commandId - コマンドID
     * @param {boolean} enabled - 有効かどうか
     */
    setCommandEnabled(commandId, enabled) {
        const command = this.commands.find(cmd => cmd.id === commandId);
        if (command) {
            command.enabled = enabled;
            if (this.currentMode === 'main') {
                this.showMainMenu();
            }
        }
    }

    /**
     * すべてのコマンドを無効にする
     */
    disableAllCommands() {
        this.commands.forEach(command => command.enabled = false);
        if (this.currentMode === 'main') {
            this.showMainMenu();
        }
    }

    /**
     * すべてのコマンドを有効にする
     */
    enableAllCommands() {
        this.commands.forEach(command => command.enabled = true);
        if (this.currentMode === 'main') {
            this.showMainMenu();
        }
    }

    /**
     * 現在のメニューモードを取得する
     * @returns {string} 現在のモード
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * コマンド処理（親から呼ばれるメソッド）
     * @param {string} command - 実行するコマンド
     */
    handleCommand(command) {
        // カスタムイベントを発火
        this.dispatchEvent(new CustomEvent('command-selected', {
            detail: { command: command },
            bubbles: true
        }));
    }

    /**
     * アイテム使用（親から呼ばれるメソッド）
     * @param {string} itemId - アイテムID
     */
    useItem(itemId) {
        this.dispatchEvent(new CustomEvent('item-selected', {
            detail: { itemId: itemId },
            bubbles: true
        }));
    }

    /**
     * 魔法使用（親から呼ばれるメソッド）
     * @param {string} spellId - 魔法ID
     */
    useMagic(spellId) {
        this.dispatchEvent(new CustomEvent('magic-selected', {
            detail: { spellId: spellId },
            bubbles: true
        }));
    }
}

// カスタム要素として登録
customElements.define('command-menu', CommandMenu);