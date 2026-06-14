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

            currentWaveText: document.getElementById("current-wave-text"),
            waveTrack: document.getElementById("wave-track"),
            activeThreatsList: document.getElementById("active-threats-list"),
            nextWavePreviewIcons: document.getElementById("next-wave-preview-icons"),
            floatingDetailPanel: document.getElementById("floating-detail-panel"),
            selectionDetails: document.getElementById("selection-details"),

            speedPause: document.getElementById("btn-speed-pause"),
            speed1x: document.getElementById("btn-speed-1x"),
            speed2x: document.getElementById("btn-speed-2x"),

            modalStageSelect: document.getElementById("modal-stage-select"),
            modalTechTree: document.getElementById("modal-tech-tree"),
            modalGameEnd: document.getElementById("modal-game-end"),

            overlayMessage: document.getElementById("sidebar-wave-control"),
            overlayTitle: document.getElementById("overlay-title"),
            btnStartWave: document.getElementById("btn-start-wave"),

            btnTechTree: document.getElementById("btn-tech-tree"),
            btnCloseTech: document.getElementById("btn-close-tech"),
            btnFullscreen: document.getElementById("btn-fullscreen"),
            btnThreatInfo: document.getElementById("btn-threat-info")
        };

        this.currentEntity = null;
        this.attackerInfo = {
            phishing: {
                name: "フィッシングメール",
                icon: "✉️",
                shortDesc: "認証回避・社会工学",
                desc: "境界防御(FW)を無効化し、DMZをスキップして内部サーバに直接侵入します。フィッシング攻撃に対してはメールフィルターが有効です。"
            },
            bruteforce: {
                name: "ブルートフォース攻撃",
                icon: "🔑",
                shortDesc: "認証攻撃・パスワードリスト",
                desc: "総当たりで認証突破を狙う。認証強化が無いノードでは急加速します。多要素認証(MFA)による防御が効果的です。"
            },
            sqlinjection: {
                name: "SQLインジェクション",
                icon: "💻",
                shortDesc: "脆弱性攻撃・DBバイパス",
                desc: "WebサーバからDBサーバへ直接バイパス・侵入する特性を持ちます。Webサーバ保護のためにWAFの設置が推奨されます。"
            },
            ransomware: {
                name: "ランサムウェア",
                icon: "💀",
                shortDesc: "マルウェア・暗号化",
                desc: "到達したサーバ内のファイルを暗号化してシステムを停止させます。EDRによる撃退やバックアップによる緊急復旧が必要です。"
            },
            apt: {
                name: "APT (持続的標的型)",
                icon: "🕵️",
                shortDesc: "標的型攻撃・潜伏偵察",
                desc: "高度なステルス（検知回避）能力を持つ、潜伏型の組織的・持続的攻撃。検知能力を高めるセキュリティ対策が求められます。"
            },
            insider: {
                name: "内部不正",
                icon: "👤",
                shortDesc: "権限悪用・情報持ち出し",
                desc: "境界防御をバイパスしてDMZ以降の内部から直接出現する。セキュリティ教育やMFA、内部監視等が有効です。"
            }
        };

        this.defenderInfo = {
            mailfilter: {
                name: "メールフィルター",
                icon: "✉️",
                cost: 800,
                desc: "メール系の攻撃（フィッシング）をブロックします。フィッシング攻撃に対して高い攻撃力を持ちます。"
            },
            education: {
                name: "セキュリティ教育",
                icon: "👥",
                cost: 600,
                desc: "人間に起因する攻撃（フィッシングや内部不正）を遅延させ、進行速度を低下させます。攻撃力はありません。"
            },
            edr: {
                name: "EDR",
                icon: "🛡️",
                cost: 900,
                desc: "ホストPC上の挙動検知を行います。ランサムウェア等のマルウェアに対して非常に強力です。"
            },
            waf: {
                name: "WAF",
                icon: "🌐",
                cost: 1000,
                desc: "Webサーバの手前に配置し、SQLインジェクションなどのWeb脆弱性攻撃を検知・遮断します。"
            },
            firewall: {
                name: "ファイアウォール",
                icon: "🛡️",
                cost: 700,
                desc: "もっとも基本的な境界防御。インターネットとDMZ間、または内部セグメント間の不要なポート通信を遮断します。"
            },
            mfa: {
                name: "MFA (多要素認証)",
                icon: "🔑",
                cost: 800,
                desc: "認証・ADノード等に設置。ブルートフォース等の認証突破試行を強力に遅延・ブロックします。"
            },
            siem: {
                name: "SIEM",
                icon: "🖥️",
                cost: 1200,
                desc: "全ノードからのログを集約監視し、潜伏するAPT攻撃などの検知率・撃退力を高めます。"
            },
            backup: {
                name: "バックアップ",
                icon: "💾",
                cost: 600,
                desc: "ランサムウェアで暗号化被害に遭ったサーバーのデータを、人員を割くことなく自動かつ安全に復旧させます。"
            }
        };

        this.initStaticEvents();
    }

    initStaticEvents() {
        // スピード制御
        this.dom.speedPause.addEventListener("click", () => this.setGameSpeed(0));
        this.dom.speed1x.addEventListener("click", () => this.setGameSpeed(1));
        this.dom.speed2x.addEventListener("click", () => this.setGameSpeed(2));

        // 全画面表示の切り替え
        if (this.dom.btnFullscreen) {
            this.dom.btnFullscreen.addEventListener("click", () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        this.log(`[エラー] 全画面表示に切り替えられません: ${err.message}`, "alert");
                    });
                } else {
                    document.exitFullscreen();
                }
            });
        }

        // 技術ツリー開閉 (⚙ギアアイコン)
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

        // ショップパレットカテゴリーフィルタータブ
        document.querySelectorAll(".tab-btn").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                const category = tab.dataset.category;
                this.filterPalette(category);
            });
        });

        // 脅威情報ボタン
        if (this.dom.btnThreatInfo) {
            this.dom.btnThreatInfo.addEventListener("click", () => {
                this.log(`[脅威インテル] 現在のステージ: ${this.game.stage ? this.game.stage.name : '未選択'}. 侵入経路を監視し、多層防御を構築してください。`, "system");
                alert(`【現在の脅威情報】\n・フィッシングメール: 境界(FW)をスルーして直接Webや認証に到達。\n・ブルートフォース: MFAで大幅遅延可能。\n・SQLインジェクション: WebサーバーからDBへバイパス。\n・ランサムウェア: 到達するとサーバーを暗号化(停止)。EDRが特効。\n・内部不正: 境界(FW, WAF)を全てバイパスし、内部から出現。`);
            });
        }


    }

    filterPalette(category) {
        document.querySelectorAll(".bottom-palette-panel .palette-item").forEach(item => {
            if (category === "all" || item.dataset.category === category) {
                item.classList.remove("hidden");
            } else {
                item.classList.add("hidden");
            }
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
        // SOCログはコンソールに流す、もしくは画面外の裏ログにする
        console.log(`[LOG - ${type}] ${message}`);
    }

    updateHUD() {
        if (!this.game.stage) return;

        // 信頼度
        const trust = Math.round(this.game.trust);
        this.dom.trustVal.textContent = `${trust}%`;
        this.dom.trustBar.style.width = `${trust}%`;

        // 事業継続
        const continuity = Math.round(this.game.continuity);
        this.dom.continuityVal.textContent = `${continuity}%`;
        this.dom.continuityBar.style.width = `${continuity}%`;

        // 予算と人員
        this.dom.budgetVal.textContent = this.game.budget.toLocaleString();
        this.dom.staffVal.textContent = `${this.game.staffAvailable} / ${this.game.staffMax}`;

        // ステージとウェーブ情報 (ステージ番号とタイトルを分割して2行表示)
        let stageNum = "ステージ -";
        let stageTitle = "作戦準備完了";
        if (this.game.stage) {
            const parts = this.game.stage.name.split(/[:：]/);
            if (parts.length >= 2) {
                stageNum = parts[0].trim();
                stageTitle = parts[1].trim();
            } else {
                stageNum = "STAGE";
                stageTitle = this.game.stage.name;
            }
        }
        document.getElementById("current-stage-name").textContent = stageNum;
        document.getElementById("current-stage-desc").textContent = stageTitle;

        const maxWave = this.game.stage.waves.length;
        const currentWave = Math.min(maxWave, this.game.currentWaveIndex + (this.game.waveInProgress ? 1 : 0));
        this.dom.currentWaveText.textContent = `${currentWave} / ${maxWave}`;

        // Wave進捗トラック（丸ノード）の更新
        const nodes = this.dom.waveTrack.querySelectorAll(".wave-node");
        nodes.forEach(node => {
            const wNum = parseInt(node.dataset.wave);
            node.className = "wave-node";
            if (wNum > maxWave) {
                node.classList.add("hidden");
            } else {
                node.classList.remove("hidden");
                if (wNum === currentWave) {
                    node.classList.add("active");
                } else if (wNum < currentWave) {
                    node.classList.add("completed");
                }
            }
        });

        // 出現中の敵リストと次のウェーブプレビューを更新
        this.updateThreatsList();
        this.updateNextWavePreview();

        // ウェーブが開始していないかつ、ゲームオーバーでなければオーバーレイを出す
        if (!this.game.waveInProgress && this.game.status === "playing" &&
            (this.dom.overlayMessage.classList.contains("hidden") || this.dom.btnStartWave.classList.contains("hidden"))) {
            const nextWaveNum = this.game.currentWaveIndex + 1;
            if (nextWaveNum <= maxWave) {
                this.showOverlayMessage(`WAVE ${nextWaveNum} 準備完了`);
            }
        }

        // ショップパレットの解放状況を更新
        this.updatePaletteUI();
    }

    updatePaletteUI() {
        const paletteItems = document.querySelectorAll(".bottom-palette-panel .palette-item");
        paletteItems.forEach(btn => {
            const type = btn.dataset.towerType;
            let isLocked = false;

            if (type === "mfa") {
                isLocked = !this.game.unlockedTech.has("mfa");
            } else if (type === "waf") {
                isLocked = !this.game.unlockedTech.has("waf");
            } else if (type === "edr") {
                isLocked = !this.game.unlockedTech.has("edr");
            }

            if (isLocked) {
                btn.classList.add("locked");
                btn.setAttribute("disabled", "true");
            } else {
                btn.classList.remove("locked");
                btn.removeAttribute("disabled");
            }

            // コスト表示を 🪙 アイコンに更新する
            const costSpan = btn.querySelector(".item-cost");
            if (costSpan) {
                let costVal = "";
                if (type === "mailfilter") costVal = "800";
                else if (type === "education") costVal = "600";
                else if (type === "edr") costVal = "900";
                else if (type === "waf") costVal = "1,000";
                else if (type === "firewall") costVal = "700";
                else if (type === "mfa") costVal = "800";
                else if (type === "siem") costVal = "1,200";
                else if (type === "backup") costVal = "600";

                costSpan.textContent = `🪙 ${costVal}`;
            }
        });
    }

    updateThreatsList() {
        const listEl = this.dom.activeThreatsList;
        if (!listEl) return;
        listEl.innerHTML = "";

        const stage = this.game.stage;
        if (!stage) return;

        // 現在のWaveインデックス
        const waveIndex = Math.min(stage.waves.length - 1, this.game.currentWaveIndex);
        const waveData = stage.waves[waveIndex];
        if (!waveData) return;

        const counts = {};
        waveData.spawnList.forEach(item => {
            counts[item.type] = (counts[item.type] || 0) + item.count;
        });

        const activeTypes = new Set(this.game.attackers.map(a => a.type));

        Object.keys(counts).forEach(type => {
            const info = this.attackerInfo[type] || { name: type, icon: "👾", shortDesc: "未知のサイバー攻撃", desc: "詳細不明のセキュリティ脅威。" };
            const isActive = activeTypes.has(type) && this.game.waveInProgress;

            const itemHtml = `
                <div class="threat-list-item ${isActive ? 'active-now' : ''}" data-threat-type="${type}" style="position: relative; cursor: help;">
                    <div class="threat-item-icon">${info.icon}</div>
                    <div class="threat-item-details">
                        <span class="threat-item-name">${info.name}</span>
                        <span class="threat-item-desc">${info.shortDesc}</span>
                    </div>
                    <div class="threat-item-count">x${counts[type]}</div>
                </div>
            `;
            listEl.insertAdjacentHTML("beforeend", itemHtml);
        });
    }

    updateNextWavePreview() {
        const container = this.dom.nextWavePreviewIcons;
        if (!container) return;
        container.innerHTML = "";

        const stage = this.game.stage;
        if (!stage) return;

        const nextWaveIndex = this.game.currentWaveIndex + (this.game.waveInProgress ? 1 : 0);
        if (nextWaveIndex >= stage.waves.length) {
            container.innerHTML = "<span style='font-size:10px;color:#39ff14;'>FINAL WAVE</span>";
            return;
        }

        const nextWaveData = stage.waves[nextWaveIndex];
        if (!nextWaveData) return;

        const ATTACKER_ICONS = {
            phishing: "✉️",
            bruteforce: "🔑",
            sqlinjection: "💻",
            ransomware: "💀",
            apt: "🕵️",
            insider: "👤"
        };

        const typesAdded = new Set();
        nextWaveData.spawnList.forEach(item => {
            if (!typesAdded.has(item.type)) {
                typesAdded.add(item.type);
                const icon = ATTACKER_ICONS[item.type] || "👾";
                const node = document.createElement("div");
                node.className = "next-preview-icon";
                node.textContent = icon;
                node.title = item.type;
                container.appendChild(node);
            }
        });
    }

    showOverlayMessage(title) {
        this.dom.overlayTitle.textContent = title;
        this.dom.overlayTitle.classList.remove("neon-text-red");
        this.dom.btnStartWave.classList.remove("hidden");
        this.dom.overlayMessage.classList.remove("hidden");

        // WAVE準備フェーズに入ったので、上部中央のWAVE警告バナーを非表示にする
        const banner = document.getElementById("wave-alert-banner");
        if (banner) {
            banner.classList.add("hidden");
        }
    }

    hideOverlayMessage() {
        // 全体を消さず、ボタンのみを非表示にする
        this.dom.btnStartWave.classList.add("hidden");
        // タイトルを進行中に変更
        const currentWave = this.game.currentWaveIndex + 1;
        this.dom.overlayTitle.textContent = `WAVE ${currentWave} 防衛フェーズ稼働中`;
        this.dom.overlayTitle.classList.add("neon-text-red");

        // WAVEが開始されたので、上部中央のWAVE警告バナーを表示する
        const banner = document.getElementById("wave-alert-banner");
        const bannerText = document.getElementById("wave-alert-text");
        if (banner && bannerText) {
            banner.classList.remove("hidden");
            const stage = this.game.stage;
            const waveIndex = Math.min(stage.waves.length - 1, this.game.currentWaveIndex);
            const waveData = stage.waves[waveIndex];
            let alertMsg = "外部からの攻撃パケット侵入中！";
            if (waveData) {
                const types = waveData.spawnList.map(item => item.type);
                if (types.includes("apt")) {
                    alertMsg = "APT (持続的標的型) が侵攻中！";
                } else if (types.includes("ransomware")) {
                    alertMsg = "ランサムウェアが侵攻中！";
                } else if (types.includes("insider")) {
                    alertMsg = "内部不正によるアクセス検知！";
                } else if (types.includes("sqlinjection")) {
                    alertMsg = "SQLインジェクション攻撃検知！";
                } else if (types.includes("bruteforce")) {
                    alertMsg = "ブルートフォース攻撃検知！";
                }
            }
            bannerText.textContent = alertMsg;
        }
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

                // 「開発済」に書き換えられたスパンをコスト表示に戻す
                // （ステージリスタート後も正しいラベルが表示されるように）
                const statusSpan = node.querySelector(".tech-status");
                if (statusSpan) {
                    const budget = node.dataset.costBudget || "?";
                    const staff  = node.dataset.costStaff  || "?";
                    statusSpan.className = "tech-cost";
                    statusSpan.textContent = `コスト: $${budget} / 👨‍💻${staff}`;
                }
            }
        });
    }

    // 防御手法の概要を一時的に表示する
    showDefenderShopDetails(type) {
        const info = this.defenderInfo[type];
        if (!info) return;

        const container = this.dom.selectionDetails;
        if (!container) return;

        container.innerHTML = `
            <div class="detail-section">
                <div class="detail-title">${info.icon} ${info.name}</div>
                <div class="detail-subtitle">防御モジュールの概要</div>
                <div class="detail-row">
                    <span class="lbl">導入コスト:</span>
                    <span class="val" style="color: var(--neon-gold); text-shadow: 0 0 5px rgba(255, 204, 0, 0.4);">🪙 ${info.cost.toLocaleString()}</span>
                </div>
                <div style="margin-top: 12px; font-size: 11.5px; line-height: 1.5; color: var(--text-dim); white-space: normal; word-break: break-all;">
                    ${info.desc}
                </div>
            </div>
        `;
    }

    // 敵（攻撃手法）の詳細概要を一時的に表示する
    showThreatDetails(type) {
        const info = this.attackerInfo[type];
        if (!info) return;

        const container = this.dom.selectionDetails;
        if (!container) return;

        container.innerHTML = `
            <div class="detail-section">
                <div class="detail-title">${info.icon} ${info.name}</div>
                <div class="detail-subtitle">攻撃手法の概要</div>
                <div class="detail-row">
                    <span class="lbl">攻撃タイプ:</span>
                    <span class="val" style="color: #ff0055; text-shadow: 0 0 5px rgba(255, 0, 85, 0.4);">${info.shortDesc}</span>
                </div>
                <div style="margin-top: 12px; font-size: 11.5px; line-height: 1.5; color: var(--text-dim); white-space: normal; word-break: break-all;">
                    ${info.desc}
                </div>
            </div>
        `;
    }

    // 選択されたエンティティ（ノードまたはスロット/タワー）の詳細表示
    showSelectionDetails(entity) {
        this.currentEntity = entity;
        this.game.selectedEntity = entity;
        const container = this.dom.selectionDetails;
        container.innerHTML = "";

        if (!entity) {
            // 常に詳細パネルの枠を表示したままにする
            this.dom.floatingDetailPanel.classList.remove("hidden");
            return;
        }

        this.dom.floatingDetailPanel.classList.remove("hidden");

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
                        <div class="detail-subtitle">セキュリティ防衛モジュール</div>
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
                            <span class="lbl">効果:</span>
                            <span class="val">${tower.type === 'education' ? '敵の進行速度 -35%' : '自動復旧ビーム照射'}</span>
                        </div>
                        `}
                    </div>
                    <div class="detail-actions">
                        ${tower.level < 3 ? `
                            <button id="btn-tower-upgrade" class="btn-cyber" ${!canUpgrade ? 'disabled' : ''}>
                                強化 🪙 ${nextLevelCost.toLocaleString()}
                            </button>
                        ` : `<button class="btn-cyber" disabled>最大レベルです</button>`}
                        <button id="btn-tower-sell" class="btn-cyber-danger">設備を売却</button>
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
                    this.log(`[防衛] ${tower.name} を売却・撤去しました。`, "system");
                });

            } else {
                // 空きスロットの詳細表示
                container.innerHTML = `
                    <div class="detail-section">
                        <div class="detail-title">空き防御スロット</div>
                        <div class="detail-subtitle">${parentNode.name} 周辺</div>
                        <p class="empty-selection">下部ショップから防御ユニットを選択し、配置してください。</p>
                    </div>
                `;
            }
        }
        // 2. サーバノードの選択時
        else {
            const node = entity;
            const hasBackup = this.game.defenders.some(d => d.type === "backup" && d.parentNodeId === node.id);

            container.innerHTML = `
                <div class="detail-section">
                    <div class="detail-title">${node.name}</div>
                    <div class="detail-subtitle">保護対象システム</div>
                    <div class="detail-row">
                        <span class="lbl">種別:</span>
                        <span class="val">${node.type.toUpperCase()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="lbl">状態:</span>
                        <span class="val ${node.status === 'nominal' ? 'neon-text-green' : 'neon-text-red'}">
                            ${node.status === 'nominal' ? '正常' : node.status === 'infected' ? '⚠️ 暗号化被害' : '❌ 停止'}
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
                            ${hasBackup ? '自動復旧稼働中' : '未設定'}
                        </span>
                    </div>
                    ` : ''}
                </div>

                ${node.status === 'infected' ? `
                <div class="detail-actions">
                    ${!node.isStaffAssigned ? `
                        <button id="btn-assign-staff" class="btn-cyber" ${this.game.staffAvailable <= 0 ? 'disabled' : ''}>
                            人員を復旧へ配置 (要 👤1)
                        </button>
                    ` : `
                        <button id="btn-unassign-staff" class="btn-cyber-outline">
                            要員を引き揚げる
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
