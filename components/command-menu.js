/**
 * コマンドメニューコンポーネント
 * バトル中の操作コマンドを管理する
 */
class CommandMenu extends HTMLElement {
    constructor() {
        super();
        this.currentMode = 'main'; // 'main', 'target', 'item', 'magic'
        this.selectedIndex = 0;
        this.commands = [
            { id: 'fight', label: '戦う', enabled: true },
            { id: 'defend', label: '防御', enabled: true },
            { id: 'magic', label: '魔法', enabled: true },
            { id: 'item', label: '道具', enabled: true }
        ];
        this.setupComponent();
        this.setupKeyboardControls();
    }

    /**
     * コンポーネントの初期設定
     */
    setupComponent() {
        this.innerHTML = `
            <style>
                :host {
                    flex: 1;
                    padding: 15px;
                    background: rgba(0,0,0,0.3);
                    border-left: 2px solid #444;
                    display: flex;
                    flex-direction: column;
                    min-width: 200px;
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
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
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
                    justify-content: flex-start;
                    padding: 12px 20px;
                    min-height: 45px;
                    position: relative;
                }

                .command-button.selected {
                    background: linear-gradient(145deg, #FFD700, #FFA000);
                    border-color: #FFD700;
                    color: #000;
                    transform: translateX(10px);
                }

                .command-button.selected::before {
                    content: '▶';
                    position: absolute;
                    left: -15px;
                    color: #FFD700;
                    font-size: 14px;
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
        
        const commandGrid = document.createElement('div');
        commandGrid.className = 'command-grid';
        
        this.commands.forEach((command, index) => {
            const button = document.createElement('button');
            button.className = 'command-button';
            button.dataset.command = command.id;
            button.dataset.index = index;
            button.textContent = command.label;
            button.disabled = !command.enabled;
            
            if (index === this.selectedIndex) {
                button.classList.add('selected');
            }
            
            button.addEventListener('click', () => {
                if (command.enabled) {
                    this.selectedIndex = index;
                    this.updateSelection();
                    this.handleCommand(command.id);
                }
            });
            
            commandGrid.appendChild(button);
        });
        
        contentElement.innerHTML = '';
        contentElement.appendChild(commandGrid);
    }

    /**
     * ターゲット選択モードを表示する
     */
    showTargetSelection() {
        this.currentMode = 'target';
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = 'ターゲット選択';
        
        const instruction = document.createElement('div');
        instruction.className = 'target-instruction';
        instruction.textContent = '攻撃対象を選択してください';
        
        const commandList = document.createElement('div');
        commandList.className = 'command-list';
        
        const backButton = document.createElement('button');
        backButton.className = 'back-button command-button';
        backButton.textContent = '戻る';
        backButton.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        commandList.appendChild(backButton);
        
        contentElement.innerHTML = '';
        contentElement.appendChild(instruction);
        contentElement.appendChild(commandList);
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
        
        const commandList = document.createElement('div');
        commandList.className = 'command-list';
        
        const itemListContainer = document.createElement('div');
        itemListContainer.className = 'item-list';
        
        if (items.length > 0) {
            items.forEach(item => {
                const itemButton = document.createElement('button');
                itemButton.className = 'item-button command-button';
                itemButton.dataset.item = item.id;
                itemButton.innerHTML = `
                    ${item.name}
                    <span class="item-quantity">×${item.quantity}</span>
                `;
                itemButton.addEventListener('click', () => {
                    this.useItem(item.id);
                });
                itemListContainer.appendChild(itemButton);
            });
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.cssText = 'color: #666; text-align: center; padding: 20px;';
            emptyMessage.textContent = '使用できるアイテムがありません';
            itemListContainer.appendChild(emptyMessage);
        }
        
        const backButton = document.createElement('button');
        backButton.className = 'back-button command-button';
        backButton.textContent = '戻る';
        backButton.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        commandList.appendChild(itemListContainer);
        commandList.appendChild(backButton);
        
        contentElement.innerHTML = '';
        contentElement.appendChild(commandList);
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
        
        const commandList = document.createElement('div');
        commandList.className = 'command-list';
        
        const magicListContainer = document.createElement('div');
        magicListContainer.className = 'magic-list';
        
        if (spells.length > 0) {
            spells.forEach(spell => {
                const spellButton = document.createElement('button');
                spellButton.className = 'magic-button command-button';
                spellButton.dataset.spell = spell.id;
                spellButton.disabled = spell.mpCost > spell.availableMp;
                
                const spellName = document.createElement('span');
                spellName.className = spell.mpCost > spell.availableMp ? 'disabled-text' : '';
                spellName.textContent = spell.name;
                
                const mpCost = document.createElement('span');
                mpCost.className = 'mp-cost';
                mpCost.textContent = `MP${spell.mpCost}`;
                
                spellButton.appendChild(spellName);
                spellButton.appendChild(mpCost);
                
                spellButton.addEventListener('click', () => {
                    if (spell.mpCost <= spell.availableMp) {
                        this.useMagic(spell.id);
                    }
                });
                
                magicListContainer.appendChild(spellButton);
            });
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.cssText = 'color: #666; text-align: center; padding: 20px;';
            emptyMessage.textContent = '使用できる呪文がありません';
            magicListContainer.appendChild(emptyMessage);
        }
        
        const backButton = document.createElement('button');
        backButton.className = 'back-button command-button';
        backButton.textContent = '戻る';
        backButton.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        commandList.appendChild(magicListContainer);
        commandList.appendChild(backButton);
        
        contentElement.innerHTML = '';
        contentElement.appendChild(commandList);
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

    /**
     * キーボード操作を設定する
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            // メインメニュー時のみキー操作を有効にする
            if (this.currentMode !== 'main') return;

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
                case ' ':
                    event.preventDefault();
                    this.executeSelectedCommand();
                    break;
                case 'Escape':
                    event.preventDefault();
                    if (this.currentMode !== 'main') {
                        this.showMainMenu();
                    }
                    break;
            }
        });
    }

    /**
     * 選択を移動する
     * @param {number} direction - 移動方向（-1: 上, 1: 下）
     */
    moveSelection(direction) {
        const enabledCommands = this.commands.filter(cmd => cmd.enabled);
        const currentEnabledIndex = enabledCommands.findIndex(cmd => 
            cmd === this.commands[this.selectedIndex]
        );
        
        if (enabledCommands.length === 0) return;
        
        const newEnabledIndex = (currentEnabledIndex + direction + enabledCommands.length) % enabledCommands.length;
        const newCommand = enabledCommands[newEnabledIndex];
        this.selectedIndex = this.commands.findIndex(cmd => cmd === newCommand);
        
        this.updateSelection();
    }

    /**
     * 選択状態を更新する
     */
    updateSelection() {
        const buttons = this.querySelectorAll('.command-button');
        buttons.forEach((button, index) => {
            button.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    /**
     * 選択されたコマンドを実行する
     */
    executeSelectedCommand() {
        const selectedCommand = this.commands[this.selectedIndex];
        if (selectedCommand && selectedCommand.enabled) {
            this.handleCommand(selectedCommand.id);
        }
    }

    /**
     * 選択インデックスをリセットする
     */
    resetSelection() {
        this.selectedIndex = 0;
        this.updateSelection();
    }
}

// カスタム要素として登録
customElements.define('command-menu', CommandMenu);