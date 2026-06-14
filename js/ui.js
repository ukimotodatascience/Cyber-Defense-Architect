/* Cyber Defense Architect - UI Updates & Event Management */

import { TECH_ITEMS } from './tech.js';
import { FloatingText } from './units.js';

export class UIManager {
    constructor(game) {
        this.game = game;

        // DOMキャッシュ
        this.dom = {
            trustVal: document.getElementById("stat-trust"),
            trustBar: document.getElementById("bar-trust"),
            continuityVal: document.getElementById("stat-continuity"),
            continuityBar: document.getElementById("bar-continuity"),
            budgetVal: document.getElementById("stat-budget"),
            staffVal: document.getElementById("stat-staff"),
            stageName: document.getElementById("current-stage-name"),
            waveInfo: document.getElementById("current-wave-info"),

            speedPause: document.getElementById("btn-speed-pause"),
            speed1x: document.getElementById("btn-speed-1x"),
            speed2x: document.getElementById("btn-speed-2x"),

            socLog: document.getElementById("soc-log"),
            selectionDetails: document.getElementById("selection-details"),

            modalStageSelect: document.getElementById("modal-stage-select"),
            modalTechTree: document.getElementById("modal-tech-tree"),
            modalGameEnd: document.getElementById("modal-game-end"),

            overlayMessage: document.getElementById("canvas-overlay-message"),
            overlayTitle: document.getElementById("overlay-title"),
            btnStartWave: document.getElementById("btn-start-wave"),

            btnTechTree: document.getElementById("btn-tech-tree"),
            btnCloseTech: document.getElementById("btn-close-tech"),
            btnFullscreen: document.getElementById("btn-fullscreen")
        };

        this.initStaticEvents();
    }

    initStaticEvents() {
        // スピード制御
        this.dom.speedPause.addEventListener("click", () => this.setGameSpeed(0));
        this.dom.speed1x.addEventListener("click", () => this.setGameSpeed(1));
        this.dom.speed2x.addEventListener("click", () => this.setGameSpeed(2));

        // 全画面表示の切り替え
        this.dom.btnFullscreen.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    this.log(`[エラー] 全画面表示に切り替えられません: ${err.message}`, "alert");
                });
            } else {
                document.exitFullscreen();
            }
        });

        // 技術ツリー開閉
        this.dom.btnTechTree.addEventListener("click", () => this.openTechTree());
        this.dom.btnCloseTech.addEventListener("click", () => this.closeTechTree());

        // ウェーブ開始ボタン
        this.dom.btnStartWave.addEventListener("click", () => {
            if (this.game.startNextWave()) {
                this.hideOverlayMessage();
                this.log(`[オペレーション] ウェーブ ${this.game.currentWaveIndex + 1} 開始！攻撃が侵入しています。`, "warn");
            }
        });

        // リスタート・ステージ選択へ
        document.getElementById("btn-restart").addEventListener("click", () => {
            this.hideModal(this.dom.modalGameEnd);
            if (this.game.loadStage(this.game.stage.id)) {
                const canvas = document.getElementById("game-canvas");
                if (canvas) {
                    this.game.map.initializeTopology(canvas.width, canvas.height);
                } else {
                    this.game.map.initializeTopology();
                }
                this.showSelectionDetails(null);
                this.updateHUD();
                this.log(`[システム] ステージをリスタートしました。`, "system");
            }
        });
        document.getElementById("btn-back-to-select").addEventListener("click", () => {
            this.hideModal(this.dom.modalGameEnd);
            this.showModal(this.dom.modalStageSelect);
        });

        // 技術ツリーノードクリックイベント
        document.querySelectorAll(".tech-node.locked").forEach(node => {
            node.addEventListener("click", (e) => {
                const techId = node.dataset.techId;
                if (techId && this.game.techTree.canUnlock(techId)) {
                    if (this.game.techTree.unlock(techId)) {
                        this.updateTechTreeUI();
                        this.updateHUD();
                    }
                }
            });
        });
    }

    setGameSpeed(speed) {
        this.game.speed = speed;

        this.dom.speedPause.classList.remove("active");
        this.dom.speed1x.classList.remove("active");
        this.dom.speed2x.classList.remove("active");

        if (speed === 0) this.dom.speedPause.classList.add("active");
        else if (speed === 1) this.dom.speed1x.classList.add("active");
        else if (speed === 2) this.dom.speed2x.classList.add("active");
    }

    log(message, type = "normal") {
        const entry = document.createElement("div");
        entry.className = `log-entry ${type}`;

        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${message}`;

        this.dom.socLog.appendChild(entry);
        this.dom.socLog.scrollTop = this.dom.socLog.scrollHeight;
    }

    updateHUD() {
        if (!this.game.stage) return;

        // 信頼度
        const trust = Math.round(this.game.trust);
        this.dom.trustVal.textContent = `${trust}%`;
        this.dom.trustBar.style.width = `${trust}%`;
        setNeonClass(this.dom.trustVal, trust, "green", "red", 35);
        setBarFillClass(this.dom.trustBar, trust, "green", "red", 35);

        // 事業継続
        const continuity = Math.round(this.game.continuity);
        this.dom.continuityVal.textContent = `${continuity}%`;
        this.dom.continuityBar.style.width = `${continuity}%`;
        setNeonClass(this.dom.continuityVal, continuity, "blue", "red", 40);
        setBarFillClass(this.dom.continuityBar, continuity, "blue", "red", 40);

        // 予算と人員
        this.dom.budgetVal.textContent = `$${this.game.budget}`;
        this.dom.staffVal.textContent = `${this.game.staffAvailable} / ${this.game.staffMax}`;

        // ステージとウェーブ情報
        this.dom.stageName.textContent = this.game.stage.name;

        const currentWave = this.game.currentWaveIndex + (this.game.waveInProgress ? 1 : 0);
        const maxWave = this.game.stage.waves.length;
        this.dom.waveInfo.textContent = `WAVE: ${Math.min(maxWave, currentWave)} / ${maxWave}`;

        // ウェーブが開始していないかつ、ゲームオーバーでなければオーバーレイを出す
        if (!this.game.waveInProgress && this.game.status === "playing" &&
            (this.dom.overlayMessage.classList.contains("hidden") || this.dom.btnStartWave.classList.contains("hidden"))) {
            const nextWaveNum = this.game.currentWaveIndex + 1;
            if (nextWaveNum <= maxWave) {
                this.showOverlayMessage(`ウェーブ ${nextWaveNum} 準備完了`);
            }
        }
    }

    showOverlayMessage(title) {
        this.dom.overlayTitle.textContent = title;
        this.dom.overlayTitle.classList.remove("neon-text-red");
        this.dom.btnStartWave.classList.remove("hidden");

        // 次のウェーブ情報を取得
        const waveIndex = this.game.currentWaveIndex;
        const stage = this.game.stage;

        let infoHtml = "";
        if (stage && stage.waves && stage.waves[waveIndex]) {
            const waveData = stage.waves[waveIndex];
            infoHtml += `<div class="upcoming-threats">`;
            infoHtml += `<h4>🛡️ 接近中の脅威:</h4>`;
            infoHtml += `<ul>`;

            // 敵タイプごとに出現数を集計
            const counts = {};
            waveData.spawnList.forEach(item => {
                counts[item.type] = (counts[item.type] || 0) + item.count;
            });

            const ATTACKER_INFO = {
                bruteforce: { name: "ブルートフォース", icon: "🔑", desc: "総当たりで認証突破を狙う。認証強化が無いノードでは急加速します。" },
                sqlinjection: { name: "SQLインジェクション", icon: "💻", desc: "WebサーバからDBサーバへ直接バイパス・侵入する特性を持ちます。" },
                phishing: { name: "フィッシングメール", icon: "✉️", desc: "境界防御(FW)を無効化し、DMZをスキップして内部サーバに直接侵入します。" },
                ransomware: { name: "ランサムウェア", icon: "💀", desc: "到達したサーバ内のファイルを暗号化してシステムを停止させます。" },
                apt: { name: "APT (標的型攻撃)", icon: "🕵️", desc: "高度なステルス（検知回避）能力を持つ、潜伏型の組織的・持続的攻撃。" }
            };

            Object.keys(counts).forEach(type => {
                const info = ATTACKER_INFO[type] || { name: type, icon: "", desc: "" };
                infoHtml += `
                    <li class="threat-item" data-threat-type="${type}">
                        <div class="threat-header">
                            <span>${info.icon} ${info.name}</span>
                            <span class="neon-text-cyan">x${counts[type]}</span>
                        </div>
                        <div class="custom-tooltip">
                            <h5>${info.icon} ${info.name}</h5>
                            <p>${info.desc}</p>
                        </div>
                    </li>
                `;
            });
            infoHtml += `</ul></div>`;
        }

        const container = this.dom.overlayMessage;
        const infoDiv = container.querySelector(".upcoming-threats");
        if (infoDiv) {
            infoDiv.remove();
        }

        this.dom.overlayTitle.insertAdjacentHTML("afterend", infoHtml);
        this.dom.overlayMessage.classList.remove("hidden");
    }

    hideOverlayMessage() {
        // 全体を消さず、ボタンのみを非表示にする
        this.dom.btnStartWave.classList.add("hidden");
        // タイトルを進行中に変更
        const currentWave = this.game.currentWaveIndex + 1;
        this.dom.overlayTitle.textContent = `WAVE ${currentWave} 防衛フェーズ稼働中`;
        this.dom.overlayTitle.classList.add("neon-text-red");
    }

    showModal(modalEl) {
        modalEl.classList.remove("hidden");
        modalEl.classList.add("show");
    }

    hideModal(modalEl) {
        modalEl.classList.remove("show");
        modalEl.classList.add("hidden");
    }

    openTechTree() {
        this.showModal(this.dom.modalTechTree);
        this.updateTechTreeUI();
    }

    closeTechTree() {
        this.hideModal(this.dom.modalTechTree);
    }

    updateTechTreeUI() {
        document.querySelectorAll(".tech-node").forEach(node => {
            const techId = node.dataset.techId;
            if (!techId) return; // 初期アンロックノードは除外

            const isUnlocked = this.game.unlockedTech.has(techId);

            if (isUnlocked) {
                node.className = "tech-node active";
                const statusSpan = node.querySelector(".tech-status") || node.querySelector(".tech-cost");
                if (statusSpan) {
                    statusSpan.className = "tech-status";
                    statusSpan.textContent = "開発済";
                }
            } else {
                const canUnlock = this.game.techTree.canUnlock(techId);
                node.className = canUnlock ? "tech-node locked can-unlock" : "tech-node locked";

                // ネオン枠発光効果の追加 (can-unlock時)
                if (canUnlock) {
                    node.style.borderColor = "var(--neon-gold)";
                    node.style.boxShadow = "0 0 10px rgba(255, 204, 0, 0.4)";
                } else {
                    node.style.borderColor = "";
                    node.style.boxShadow = "";
                }
            }
        });
    }

    // 選択されたエンティティ（ノードまたはスロット/タワー）の詳細表示
    showSelectionDetails(entity) {
        this.game.selectedEntity = entity;
        const container = this.dom.selectionDetails;
        container.innerHTML = "";

        if (!entity) {
            container.innerHTML = `
                <div class="empty-selection">
                    <p>マップ上のノードやタワーを選択すると、詳細が表示されます。</p>
                    <p class="hint">下部のパレットから防御ユニットを選択し、マップの対応するスロット（◯）に配置してください。</p>
                </div>
            `;
            return;
        }

        // 1. スロット/タワーの選択時
        if (entity.parentNodeId !== undefined) {
            const slot = entity;
            const parentNode = this.game.map.getNodeById(slot.parentNodeId);

            if (slot.tower) {
                // タワーの詳細表示
                const tower = slot.tower;
                const nextLevelCost = tower.getUpgradeCost();
                const canUpgrade = tower.level < 3 && this.game.budget >= nextLevelCost;

                container.innerHTML = `
                    <div class="detail-section">
                        <div class="detail-title">${tower.name} (Lv.${tower.level})</div>
                        <div class="detail-subtitle">セキュリティ防御モジュール</div>
                        <div class="detail-row">
                            <span class="lbl">配置先:</span>
                            <span class="val">${parentNode.name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="lbl">射程 (Range):</span>
                            <span class="val">${Math.round(tower.range)} px</span>
                        </div>
                        ${tower.damage > 0 ? `
                        <div class="detail-row">
                            <span class="lbl">攻撃力 (Dmg):</span>
                            <span class="val">${Math.round(tower.damage)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="lbl">攻撃頻度 (Rate):</span>
                            <span class="val">${(1000 / tower.fireRate).toFixed(1)} 回/秒</span>
                        </div>
                        ` : `
                        <div class="detail-row">
                            <span class="lbl">修復力:</span>
                            <span class="val">${tower.level * 8}% 復旧/秒</span>
                        </div>
                        `}
                    </div>
                    <div class="detail-actions">
                        ${tower.level < 3 ? `
                            <button id="btn-tower-upgrade" class="btn-cyber" ${!canUpgrade ? 'disabled' : ''}>
                                アップグレード (コスト: $${nextLevelCost})
                            </button>
                        ` : `<button class="btn-cyber" disabled>最大レベルに達しました</button>`}
                        <button id="btn-tower-sell" class="btn-cyber-danger">撤去 (返還: $${Math.round(tower.cost * 0.5)})</button>
                    </div>
                `;

                // ボタンイベント
                const upgradeBtn = document.getElementById("btn-tower-upgrade");
                if (upgradeBtn) {
                    upgradeBtn.addEventListener("click", () => {
                        if (tower.upgrade(this.game)) {
                            this.showSelectionDetails(slot);
                            this.updateHUD();
                        }
                    });
                }

                document.getElementById("btn-tower-sell").addEventListener("click", () => {
                    this.game.budget += Math.round(tower.cost * 0.5);
                    this.game.effects.push(new FloatingText(`+$${Math.round(tower.cost * 0.5)}`, tower.x, tower.y, "#ffcc00"));
                    slot.tower = null;
                    this.game.defenders = this.game.defenders.filter(d => d !== tower);
                    this.showSelectionDetails(null);
                    this.updateHUD();
                    this.log(`[防衛] ${tower.name} を撤去しました。`, "system");
                });

            } else {
                // 空きスロットの詳細表示
                container.innerHTML = `
                    <div class="detail-section">
                        <div class="detail-title">空き防御スロット</div>
                        <div class="detail-subtitle">${parentNode.name} 周辺</div>
                        <p class="empty-selection">下部の防衛モジュール（Firewall等）を選択した状態で、このスロットをクリックして配置します。</p>
                    </div>
                `;
            }
        }
        // 2. サーバノードの選択時
        else {
            const node = entity;
            const hasBackup = this.game.defenders.some(d => d.type === "backup" && d.parentNodeId === node.id);

            // 人員による手動復旧がアサインされているか確認
            const isManuallyRecovering = node.isStaffAssigned;

            container.innerHTML = `
                <div class="detail-section">
                    <div class="detail-title">${node.name}</div>
                    <div class="detail-subtitle">ネットワーク・アセット</div>
                    <div class="detail-row">
                        <span class="lbl">役割:</span>
                        <span class="val">${node.type.toUpperCase()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="lbl">ステータス:</span>
                        <span class="val ${node.status === 'nominal' ? 'neon-text-green' : 'neon-text-red'}">
                            ${node.status === 'nominal' ? '正常稼働' : node.status === 'infected' ? '⚠️ 暗号化 (ランサムウェア)' : '❌ 停止'}
                        </span>
                    </div>
                    ${node.status === 'infected' ? `
                    <div class="detail-row">
                        <span class="lbl">復旧進捗:</span>
                        <span class="val">${Math.round(node.recoveryProgress)}%</span>
                    </div>
                    <div class="detail-row">
                        <span class="lbl">バックアップ保護:</span>
                        <span class="val ${hasBackup ? 'neon-text-green' : 'neon-text-red'}">
                            ${hasBackup ? '有効 (自動復旧中)' : '無効'}
                        </span>
                    </div>
                    ` : ''}
                </div>

                ${node.status === 'infected' ? `
                <div class="detail-actions">
                    ${!node.isStaffAssigned ? `
                        <button id="btn-assign-staff" class="btn-cyber" ${this.game.staffAvailable <= 0 ? 'disabled' : ''}>
                            人員を緊急復旧へ配置 (要 👨‍💻1)
                        </button>
                    ` : `
                        <button id="btn-unassign-staff" class="btn-cyber-outline">
                            緊急人員を引き揚げる
                        </button>
                    `}
                </div>
                ` : ''}
            `;

            // 人員割り当てイベント
            const assignBtn = document.getElementById("btn-assign-staff");
            if (assignBtn) {
                assignBtn.addEventListener("click", () => {
                    if (this.game.staffAvailable > 0) {
                        this.game.staffUsed++;
                        node.isStaffAssigned = true;
                        this.showSelectionDetails(node);
                        this.updateHUD();
                        this.log(`[緊急対応] ${node.name} の緊急復旧にセキュリティ要員を派遣しました。`, "warn");
                    }
                });
            }

            const unassignBtn = document.getElementById("btn-unassign-staff");
            if (unassignBtn) {
                unassignBtn.addEventListener("click", () => {
                    if (this.game.staffUsed > 0 && node.isStaffAssigned) {
                        this.game.staffUsed--;
                        node.isStaffAssigned = false;
                        this.showSelectionDetails(node);
                        this.updateHUD();
                        this.log(`[緊急対応] ${node.name} からセキュリティ要員を回収しました。`, "system");
                    }
                });
            }
        }
    }

    showGameEndScreen(isVictory) {
        this.dom.modalGameEnd.classList.remove("hidden");
        this.dom.modalGameEnd.classList.add("show");

        const titleEl = document.getElementById("game-end-title");
        const subtitleEl = document.getElementById("game-end-subtitle");
        const waveEl = document.getElementById("end-wave");
        const trustEl = document.getElementById("end-trust");
        const scoreEl = document.getElementById("end-score");

        if (isVictory) {
            titleEl.className = "neon-text-green";
            titleEl.textContent = "MISSION ACCOMPLISHED";
            subtitleEl.textContent = "セキュリティ体制が攻撃を完全に撃破し、重要資産を守り抜きました。";

            waveEl.textContent = "ALL CLEARED";
            trustEl.textContent = `${Math.round(this.game.trust)}%`;
            scoreEl.className = "neon-text-green";
            scoreEl.textContent = this.game.score;
            this.log(`[防衛任務成功] ミッションコンプリート！スコア: ${this.game.score}`, "success");
        } else {
            titleEl.className = "neon-text-red";
            titleEl.textContent = "MISSION FAILED";
            if (this.game.trust <= 0) {
                subtitleEl.textContent = "企業の社会的信頼がゼロになり、経営破綻しました。";
            } else if (this.game.continuity <= 0) {
                subtitleEl.textContent = "事業が長期間停止したため、破綻しました。";
            } else {
                subtitleEl.textContent = "システム停止時間が上限を超過し、インシデント封じ込めに失敗しました。";
            }

            waveEl.textContent = `${this.game.currentWaveIndex + 1}`;
            trustEl.textContent = `${Math.round(this.game.trust)}%`;
            scoreEl.className = "neon-text-red";
            scoreEl.textContent = this.game.score;
            this.log(`[防衛任務失敗] システムダウン、または信頼度喪失によりゲームオーバー。`, "alert");
        }
    }
}

// ユーティリティ: 動的なネオンクラス付与
function setNeonClass(el, val, primary, alt, limit) {
    el.className = `stat-value ${val > limit ? 'neon-text-' + primary : 'neon-text-' + alt}`;
}
function setBarFillClass(el, val, primary, alt, limit) {
    el.className = `bar-fill ${val > limit ? 'bg-' + primary : 'bg-' + alt}`;
}
