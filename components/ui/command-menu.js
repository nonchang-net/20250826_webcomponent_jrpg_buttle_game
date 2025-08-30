/**
 * コマンドメニューコンポーネント
 * バトル中の操作コマンドを管理する
 */
class CommandMenu extends HTMLElement {
    constructor() {
        super();
        this.currentMode = 'main'; // 'main', 'target', 'item', 'magic'
        this.selectedIndex = 0;
        this.itemSelectedIndex = 0; // 道具選択時の選択インデックス
        this.magicSelectedIndex = 0; // 魔法選択時の選択インデックス
        this.targetSelectedIndex = 0; // ターゲット選択時の選択インデックス
        this.currentItems = []; // 現在表示中のアイテムリスト
        this.currentSpells = []; // 現在表示中の魔法リスト
        this.currentTargets = []; // 現在表示中のターゲットリスト
        this.interactionEnabled = true; // コマンド選択の有効/無効状態
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
                    display: flex;
                    flex-direction: column;
                    background: rgba(0,0,0,0.3);
                    border-radius: 8px;
                    padding: 12px;
                    border: 1px solid #444;
                    min-height: 120px;
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
                    font-size: 14px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 6px 12px;
                    min-height: 28px;
                    width: 90%;
                    box-sizing: border-box;
                    position: relative;
                    margin : 0 10px;
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
                    font-size: 12px;
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

                .target-instruction {
                    color: #FFD700;
                    font-size: 12px;
                    text-align: center;
                    margin-bottom: 10px;
                    padding: 5px;
                    background: rgba(255, 215, 0, 0.1);
                    border-radius: 4px;
                }

                .item-list, .magic-list, .selection-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex: 1;
                }

                .item-button, .magic-button, .selection-button {
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

                .item-button.selected, .magic-button.selected, .selection-button.selected {
                    background: linear-gradient(145deg, #FFD700, #FFA000);
                    border-color: #FFD700;
                    color: #000;
                    transform: translateX(10px);
                }

                .item-button.selected::before, .magic-button.selected::before, .selection-button.selected::before {
                    content: '▶';
                    position: absolute;
                    left: -15px;
                    color: #FFD700;
                    font-size: 12px;
                }

                .item-button:hover:not(:disabled), .magic-button:hover:not(:disabled), .selection-button:hover:not(:disabled) {
                    background: linear-gradient(145deg, #5a5a5a, #3a3a3a);
                    border-color: #FFD700;
                    transform: translateY(-2px);
                }

                .item-button:active:not(:disabled), .magic-button:active:not(:disabled), .selection-button:active:not(:disabled) {
                    transform: translateY(0);
                }

                .item-button:disabled, .magic-button:disabled, .selection-button:disabled {
                    background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
                    border-color: #333;
                    color: #666;
                    cursor: not-allowed;
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

                .target-status {
                    color: #90EE90;
                    font-size: 12px;
                    float: right;
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
        // カーソルを最初のコマンドにリセット
        this.selectedIndex = 0;
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
        this.updateUIState();
    }

    /**
     * ターゲット選択モードを表示する
     * @param {Array} targets - 攻撃可能なターゲットリスト
     */
    showTargetSelection(targets = []) {
        this.currentMode = 'target';
        // 戻るボタンも含めた選択可能リストを作成
        this.currentTargets = [...targets, { id: '__back__', name: '戻る', isBackButton: true }];
        this.targetSelectedIndex = 0;
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = 'ターゲット選択';
        
        const targetListContainer = document.createElement('div');
        targetListContainer.className = 'selection-list';
        
        if (targets.length > 0) {
            // ターゲットボタンを作成
            targets.forEach((target, index) => {
                const targetButton = document.createElement('button');
                targetButton.className = 'selection-button';
                targetButton.dataset.target = target.id;
                targetButton.dataset.index = index;
                
                const targetName = document.createElement('span');
                targetName.textContent = target.name;
                
                targetButton.appendChild(targetName);
                
                if (index === this.targetSelectedIndex) {
                    targetButton.classList.add('selected');
                }
                
                targetButton.addEventListener('click', () => {
                    this.targetSelectedIndex = index;
                    this.updateTargetSelection();
                    this.selectTarget(target);
                });
                
                targetListContainer.appendChild(targetButton);
            });
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.cssText = 'color: #666; text-align: center; padding: 20px;';
            emptyMessage.textContent = '攻撃可能なターゲットがありません';
            targetListContainer.appendChild(emptyMessage);
        }
        
        // 戻るボタンをターゲット一覧の末尾に追加
        const backButton = document.createElement('button');
        backButton.className = 'selection-button back-style';
        backButton.dataset.index = targets.length;
        backButton.textContent = '戻る';
        
        if (targets.length === this.targetSelectedIndex) {
            backButton.classList.add('selected');
        }
        
        backButton.addEventListener('click', () => {
            this.targetSelectedIndex = targets.length;
            this.updateTargetSelection();
            this.showMainMenu();
        });
        
        targetListContainer.appendChild(backButton);
        
        contentElement.innerHTML = '';
        contentElement.appendChild(targetListContainer);
    }

    /**
     * アイテムメニューを表示する
     * @param {Array} items - 使用可能なアイテムリスト
     */
    showItemMenu(items = []) {
        // console.log('showItemMenu called with items:', items);
        this.currentMode = 'item';
        // 戻るボタンも含めた選択可能リストを作成
        this.currentItems = [...items, { id: '__back__', name: '戻る', isBackButton: true }];
        this.itemSelectedIndex = 0;
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = '道具選択';
        
        const itemListContainer = document.createElement('div');
        itemListContainer.className = 'item-list';
        
        if (items.length > 0) {
            // アイテムボタンを作成
            items.forEach((item, index) => {
                const itemButton = document.createElement('button');
                itemButton.className = 'item-button';
                itemButton.dataset.item = item.id;
                itemButton.dataset.index = index;
                
                const itemName = document.createElement('span');
                itemName.textContent = item.name;
                
                const itemQuantity = document.createElement('span');
                itemQuantity.className = 'item-quantity';
                itemQuantity.textContent = `×${item.quantity}`;
                
                itemButton.appendChild(itemName);
                itemButton.appendChild(itemQuantity);
                
                if (index === this.itemSelectedIndex) {
                    itemButton.classList.add('selected');
                }
                
                itemButton.addEventListener('click', () => {
                    this.itemSelectedIndex = index;
                    this.updateItemSelection();
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
        
        // 戻るボタンをアイテム一覧の末尾に追加
        const backButton = document.createElement('button');
        backButton.className = 'selection-button back-style';
        backButton.dataset.index = items.length;
        backButton.textContent = '戻る';
        
        if (items.length === this.itemSelectedIndex) {
            backButton.classList.add('selected');
        }
        
        backButton.addEventListener('click', () => {
            this.itemSelectedIndex = items.length;
            this.updateItemSelection();
            this.showMainMenu();
        });
        
        itemListContainer.appendChild(backButton);
        
        contentElement.innerHTML = '';
        contentElement.appendChild(itemListContainer);
    }

    /**
     * 魔法メニューを表示する
     * @param {Array} spells - 使用可能な魔法リスト
     */
    showMagicMenu(spells = []) {
        this.currentMode = 'magic';
        // 戻るボタンも含めた選択可能リストを作成
        this.currentSpells = [...spells, { id: '__back__', name: '戻る', isBackButton: true }];
        this.magicSelectedIndex = 0;
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = '魔法選択';
        
        const magicListContainer = document.createElement('div');
        magicListContainer.className = 'magic-list';
        
        if (spells.length > 0) {
            // 魔法ボタンを作成
            spells.forEach((spell, index) => {
                const spellButton = document.createElement('button');
                spellButton.className = 'magic-button';
                spellButton.dataset.spell = spell.id;
                spellButton.dataset.index = index;
                spellButton.disabled = spell.mpCost > spell.availableMp;
                
                const spellName = document.createElement('span');
                spellName.className = spell.mpCost > spell.availableMp ? 'disabled-text' : '';
                spellName.textContent = spell.name;
                
                const mpCost = document.createElement('span');
                mpCost.className = 'mp-cost';
                mpCost.textContent = `MP${spell.mpCost}`;
                
                spellButton.appendChild(spellName);
                spellButton.appendChild(mpCost);
                
                if (index === this.magicSelectedIndex) {
                    spellButton.classList.add('selected');
                }
                
                spellButton.addEventListener('click', () => {
                    this.magicSelectedIndex = index;
                    this.updateMagicSelection();
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
        
        // 戻るボタンを魔法一覧の末尾に追加
        const backButton = document.createElement('button');
        backButton.className = 'selection-button back-style';
        backButton.dataset.index = spells.length;
        backButton.textContent = '戻る';
        
        if (spells.length === this.magicSelectedIndex) {
            backButton.classList.add('selected');
        }
        
        backButton.addEventListener('click', () => {
            this.magicSelectedIndex = spells.length;
            this.updateMagicSelection();
            this.showMainMenu();
        });
        
        magicListContainer.appendChild(backButton);
        
        contentElement.innerHTML = '';
        contentElement.appendChild(magicListContainer);
    }

    /**
     * 再プレイメニューを表示する
     */
    showReplayMenu() {
        this.currentMode = 'replay';
        const titleElement = this.querySelector('#menu-title');
        const contentElement = this.querySelector('#menu-content');
        
        titleElement.textContent = '勝負終了';
        
        const commandList = document.createElement('div');
        commandList.className = 'command-list';
        
        // 再プレイボタン
        const replayButton = document.createElement('button');
        replayButton.className = 'command-button selected';
        replayButton.textContent = '再プレイ';
        replayButton.addEventListener('click', () => {
            this.handleReplay();
        });
        
        commandList.appendChild(replayButton);
        
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
        // console.log('useItem called with:', itemId);
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
     * 再プレイ処理（親から呼ばれるメソッド）
     */
    handleReplay() {
        this.dispatchEvent(new CustomEvent('replay-selected', {
            detail: {},
            bubbles: true
        }));
    }

    /**
     * キーボード操作を設定する
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            // コマンド操作が無効化されている場合は何もしない
            if (!this.interactionEnabled) return;
            
            // メインメニュー、道具選択、魔法選択、ターゲット選択メニュー時にキー操作を有効にする
            if (!['main', 'item', 'magic', 'target'].includes(this.currentMode)) return;

            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    if (this.currentMode === 'main') {
                        this.moveSelection(-1);
                    } else if (this.currentMode === 'item') {
                        this.moveItemSelection(-1);
                    } else if (this.currentMode === 'magic') {
                        this.moveMagicSelection(-1);
                    } else if (this.currentMode === 'target') {
                        this.moveTargetSelection(-1);
                    }
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    if (this.currentMode === 'main') {
                        this.moveSelection(1);
                    } else if (this.currentMode === 'item') {
                        this.moveItemSelection(1);
                    } else if (this.currentMode === 'magic') {
                        this.moveMagicSelection(1);
                    } else if (this.currentMode === 'target') {
                        this.moveTargetSelection(1);
                    }
                    break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    if (this.currentMode === 'main') {
                        this.executeSelectedCommand();
                    } else if (this.currentMode === 'item') {
                        this.executeSelectedItem();
                    } else if (this.currentMode === 'magic') {
                        this.executeSelectedSpell();
                    } else if (this.currentMode === 'target') {
                        this.executeSelectedTarget();
                    }
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
     * アイテム選択を移動する
     * @param {number} direction - 移動方向（-1: 上, 1: 下）
     */
    moveItemSelection(direction) {
        if (this.currentItems.length === 0) return;
        
        this.itemSelectedIndex = (this.itemSelectedIndex + direction + this.currentItems.length) % this.currentItems.length;
        this.updateItemSelection();
    }

    /**
     * アイテム選択状態を更新する
     */
    updateItemSelection() {
        const buttons = this.querySelectorAll('.item-button, .selection-button');
        buttons.forEach((button, index) => {
            button.classList.toggle('selected', index === this.itemSelectedIndex);
        });
    }

    /**
     * 選択されたアイテムを実行する
     */
    executeSelectedItem() {
        if (this.currentItems.length > 0 && this.currentItems[this.itemSelectedIndex]) {
            const selectedItem = this.currentItems[this.itemSelectedIndex];
            if (selectedItem.isBackButton) {
                this.showMainMenu();
            } else {
                this.useItem(selectedItem.id);
            }
        }
    }

    /**
     * 魔法選択を移動する
     * @param {number} direction - 移動方向（-1: 上, 1: 下）
     */
    moveMagicSelection(direction) {
        if (this.currentSpells.length === 0) return;
        
        this.magicSelectedIndex = (this.magicSelectedIndex + direction + this.currentSpells.length) % this.currentSpells.length;
        this.updateMagicSelection();
    }

    /**
     * 魔法選択状態を更新する
     */
    updateMagicSelection() {
        const buttons = this.querySelectorAll('.magic-button, .selection-button');
        buttons.forEach((button, index) => {
            button.classList.toggle('selected', index === this.magicSelectedIndex);
        });
    }

    /**
     * 選択された魔法を実行する
     */
    executeSelectedSpell() {
        if (this.currentSpells.length > 0 && this.currentSpells[this.magicSelectedIndex]) {
            const selectedSpell = this.currentSpells[this.magicSelectedIndex];
            if (selectedSpell.isBackButton) {
                this.showMainMenu();
            } else if (selectedSpell.mpCost <= selectedSpell.availableMp) {
                this.useMagic(selectedSpell.id);
            }
        }
    }

    /**
     * ターゲット選択を移動する
     * @param {number} direction - 移動方向（-1: 上, 1: 下）
     */
    moveTargetSelection(direction) {
        if (this.currentTargets.length === 0) return;
        
        this.targetSelectedIndex = (this.targetSelectedIndex + direction + this.currentTargets.length) % this.currentTargets.length;
        this.updateTargetSelection();
    }

    /**
     * ターゲット選択状態を更新する
     */
    updateTargetSelection() {
        const buttons = this.querySelectorAll('.selection-button');
        buttons.forEach((button, index) => {
            button.classList.toggle('selected', index === this.targetSelectedIndex);
        });
    }

    /**
     * 選択されたターゲットを実行する
     */
    executeSelectedTarget() {
        if (this.currentTargets.length > 0 && this.currentTargets[this.targetSelectedIndex]) {
            const selectedTarget = this.currentTargets[this.targetSelectedIndex];
            if (selectedTarget.isBackButton) {
                this.showMainMenu();
            } else {
                this.selectTarget(selectedTarget);
            }
        }
    }

    /**
     * ターゲット選択（親から呼ばれるメソッド）
     * @param {Object} target - 選択されたターゲット
     */
    selectTarget(target) {
        this.dispatchEvent(new CustomEvent('target-selected', {
            detail: { target: target },
            bubbles: true
        }));
    }

    /**
     * 選択インデックスをリセットする
     */
    resetSelection() {
        this.selectedIndex = 0;
        this.itemSelectedIndex = 0;
        this.magicSelectedIndex = 0;
        this.targetSelectedIndex = 0;
        this.updateSelection();
    }

    /**
     * コマンド操作の有効/無効を設定する
     * @param {boolean} enabled - 有効にするかどうか
     */
    setInteractionEnabled(enabled) {
        this.interactionEnabled = enabled;
        this.updateUIState();
    }

    /**
     * UI状態を更新する（無効化時は視覚的にグレーアウト）
     */
    updateUIState() {
        const menuContent = this.querySelector('#menu-content');
        if (menuContent) {
            if (this.interactionEnabled) {
                menuContent.style.opacity = '1';
                menuContent.style.pointerEvents = 'auto';
            } else {
                menuContent.style.opacity = '0.5';
                menuContent.style.pointerEvents = 'none';
            }
        }
    }
}

// カスタム要素として登録
customElements.define('command-menu', CommandMenu);