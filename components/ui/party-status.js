/**
 * パーティステータスコンポーネント
 * プレイヤーパーティメンバーのステータスを表示する
 */
class PartyStatus extends HTMLElement {
    constructor() {
        super();
        this.partyMembers = [];
        this.activePlayerIndex = -1;
        this.setupComponent();
    }

    /**
     * コンポーネントの初期設定
     */
    setupComponent() {
        this.innerHTML = `
            <style>
                :host {
                    flex: 2;
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    background: rgba(0,0,0,0.2);
                    overflow-y: auto;
                }

                .party-member {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 6px 12px;
                    border-radius: 5px;
                    margin : 10px;
                    color: white;
                    border-left: 4px solid #4CAF50;
                    transition: all 0.3s ease;
                    min-height: 60px;
                    flex-shrink: 0;
                }

                .party-member.weakened {
                    border-left-color: #FFA500;
                    background: rgba(255, 165, 0, 0.2);
                }

                .party-member.active-turn {
                    border-bottom: 3px dashed #4CAF50;
                    animation: activeTurn 2s ease-in-out infinite;
                }

                @keyframes activeTurn {
                    0% { border-bottom-color: #4CAF50; }
                    50% { border-bottom-color: #81C784; }
                    100% { border-bottom-color: #4CAF50; }
                }

                .party-member.defeated {
                    border-left-color: #FF6B6B;
                    background: rgba(255, 107, 107, 0.2);
                    opacity: 0.7;
                }

                .member-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .member-name {
                    font-weight: bold;
                    min-width: 70px;
                    font-size: 14px;
                }

                .member-level {
                    font-size: 11px;
                    color: #FFD700;
                }

                .member-stats {
                    display: flex;
                    gap: 15px;
                    font-size: 13px;
                }

                .stat {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .stat-label {
                    font-weight: bold;
                    min-width: 25px;
                }

                .hp-bar, .mp-bar {
                    width: 50px;
                    height: 6px;
                    background: rgba(0,0,0,0.5);
                    border-radius: 3px;
                    overflow: hidden;
                    border: 1px solid #666;
                    position: relative;
                }

                .hp-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #FF6B6B, #4CAF50);
                    transition: width 0.3s ease;
                }

                .mp-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3498DB, #2196F3);
                    transition: width 0.3s ease;
                }

                .stat-value {
                    font-size: 11px;
                    min-width: 30px;
                    text-align: center;
                }

                .equipment-info {
                    font-size: 10px;
                    color: #B0B0B0;
                    margin-top: 2px;
                }

                .status-effects {
                    display: flex;
                    gap: 5px;
                    margin-top: 2px;
                }

                .status-effect {
                    background: #FF6B6B;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                }

                @keyframes heal {
                    0% { background-color: rgba(76, 175, 80, 0.3); }
                    100% { background-color: rgba(255, 255, 255, 0.1); }
                }

                .heal-animation {
                    animation: heal 0.8s ease-in-out;
                }

                @keyframes damage {
                    0% { background-color: rgba(255, 107, 107, 0.3); }
                    100% { background-color: rgba(255, 255, 255, 0.1); }
                }

                .damage-animation {
                    animation: damage 0.8s ease-in-out;
                }

            </style>
            
            <div id="party-container">
                <!-- パーティメンバーがここに表示される -->
            </div>
        `;
    }

    /**
     * パーティメンバーデータを設定する
     * @param {Array} members - パーティメンバーの配列
     */
    setPartyMembers(members) {
        this.partyMembers = members.map(member => ({
            ...member,
            currentHp: member.currentHp || parseInt(member.hp) || 0,
            currentMp: member.currentMp || parseInt(member.mp) || 0,
            level: member.level || 1,
            statusEffects: member.statusEffects || []
        }));
        this.render();
    }

    /**
     * パーティステータスを描画する
     */
    render() {
        const container = this.querySelector('#party-container');
        container.innerHTML = '';
        
        this.partyMembers.forEach((member, index) => {
            const memberElement = document.createElement('div');
            memberElement.className = 'party-member';
            memberElement.dataset.index = index;
            
            // HP/MPの計算
            const maxHp = member.maxHp;
            const maxMp = member.maxMp;
            const hpPercentage = Math.floor((member.currentHp / maxHp) * 100);
            const mpPercentage = maxMp > 0 ? Math.floor((member.currentMp / maxMp) * 100) : 0;
            
            // 装備情報を取得
            const equippedItem = member.inventoryItems?.find(item => item.equipped === "TRUE");
            const equipmentText = equippedItem ? equippedItem.inventories : '装備なし';
            
            // ステータス効果の表示
            const statusEffectsHtml = member.statusEffects && member.statusEffects.length > 0 
                ? `<div class="status-effects">
                    ${member.statusEffects.map(effect => `<span class="status-effect">${effect}</span>`).join('')}
                   </div>`
                : '';
            
            memberElement.innerHTML = `
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-level">Lv.${member.level}</div>
                    <div class="equipment-info">${equipmentText}</div>
                    ${statusEffectsHtml}
                </div>
                <div class="member-stats">
                    <div class="stat">
                        <span class="stat-label">HP</span>
                        <div class="hp-bar">
                            <div class="hp-fill" style="width: ${hpPercentage}%"></div>
                        </div>
                        <span class="stat-value">${member.currentHp}/${maxHp}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">MP</span>
                        <div class="mp-bar">
                            <div class="mp-fill" style="width: ${mpPercentage}%"></div>
                        </div>
                        <span class="stat-value">${member.currentMp}/${maxMp}</span>
                    </div>
                </div>
            `;
            
            // HP状態による表示設定
            if (member.currentHp <= 0) {
                memberElement.classList.add('defeated');
            } else if (member.currentHp <= maxHp / 3) {
                memberElement.classList.add('weakened');
            }
            
            // 行動選択中のプレイヤーをハイライト
            if (index === this.activePlayerIndex) {
                memberElement.classList.add('active-turn');
            }
            
            
            container.appendChild(memberElement);
        });
    }


    /**
     * メンバーのHPを更新する
     * @param {number} index - 更新するメンバーのインデックス
     * @param {number} newHp - 新しいHP値
     * @param {boolean} isHealing - 回復かどうか
     */
    updateMemberHp(index, newHp, isHealing = false) {
        if (this.partyMembers[index]) {
            const maxHp = parseInt(this.partyMembers[index].hp);
            this.partyMembers[index].currentHp = Math.max(0, Math.min(maxHp, newHp));
            
            // アニメーション効果
            const memberElement = this.querySelector(`[data-index="${index}"]`);
            if (memberElement) {
                memberElement.classList.add(isHealing ? 'heal-animation' : 'damage-animation');
                setTimeout(() => {
                    memberElement.classList.remove('heal-animation', 'damage-animation');
                }, 800);
            }
            
            this.render();
        }
    }

    /**
     * メンバーのMPを更新する
     * @param {number} index - 更新するメンバーのインデックス
     * @param {number} newMp - 新しいMP値
     */
    updateMemberMp(index, newMp) {
        if (this.partyMembers[index]) {
            const maxMp = parseInt(this.partyMembers[index].mp);
            this.partyMembers[index].currentMp = Math.max(0, Math.min(maxMp, newMp));
            this.render();
        }
    }

    /**
     * メンバーにステータス効果を追加する
     * @param {number} index - メンバーのインデックス
     * @param {string} statusEffect - 追加するステータス効果
     */
    addStatusEffect(index, statusEffect) {
        if (this.partyMembers[index]) {
            if (!this.partyMembers[index].statusEffects.includes(statusEffect)) {
                this.partyMembers[index].statusEffects.push(statusEffect);
                this.render();
            }
        }
    }

    /**
     * メンバーからステータス効果を削除する
     * @param {number} index - メンバーのインデックス
     * @param {string} statusEffect - 削除するステータス効果
     */
    removeStatusEffect(index, statusEffect) {
        if (this.partyMembers[index]) {
            const effectIndex = this.partyMembers[index].statusEffects.indexOf(statusEffect);
            if (effectIndex > -1) {
                this.partyMembers[index].statusEffects.splice(effectIndex, 1);
                this.render();
            }
        }
    }


    /**
     * 生存しているメンバーの数を取得する
     * @returns {number} 生存しているメンバーの数
     */
    getAliveCount() {
        return this.partyMembers.filter(member => member.currentHp > 0).length;
    }

    /**
     * 行動選択中のプレイヤーを設定する
     * @param {Object} activePlayer - 行動選択中のプレイヤー（nullの場合は全てのハイライトを解除）
     */
    setActivePlayer(activePlayer) {
        if (activePlayer) {
            // プレイヤーIDまたは名前でインデックスを特定
            this.activePlayerIndex = this.partyMembers.findIndex(member => 
                member.id === activePlayer.id || member.name === activePlayer.name
            );
        } else {
            this.activePlayerIndex = -1;
        }
        this.render();
    }

}

// カスタム要素として登録
customElements.define('party-status', PartyStatus);