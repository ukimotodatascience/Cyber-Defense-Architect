/* Cyber Defense Architect - Main Entry Point & Game Loop */

import { GameState } from './game.js';
import { NetworkMap, getPointOnPath } from './map.js';
import { UIManager } from './ui.js';
import { Attacker, Defender, FloatingText } from './units.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. 各システムのインスタンス化
    const game = new GameState();
    const map = new NetworkMap();
    game.map = map;
    const ui = new UIManager(game);
    game.ui = ui;
    window.game = game;

    // キャンバスコンテキスト
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.logicalWidth = 1200;
    canvas.logicalHeight = 540;

    // UIインタラクション状態
    let selectedPaletteTower = null; // パレットで選択されたタワータイプ名
    let hoveredSlot = null;
    let selectedSlot = null;
    let hoveredNode = null; // ホバー（またはタップ）されたノードオブジェクト
    let lastTime = performance.now();

    // Canvasの論理解像度固定化とレイアウト初期化
    function resizeCanvas() {
        const isMobile = window.innerWidth <= 767;
        const dpr = window.devicePixelRatio || 1;

        if (isMobile) {
            // モバイル縦長アスペクト比 (941x1672)
            canvas.logicalWidth = 941;
            canvas.logicalHeight = 1672;
        } else {
            // PC横長アスペクト比 (1200x540)
            canvas.logicalWidth = 1200;
            canvas.logicalHeight = 540;
        }

        // 1. まず表示上のサイズ (CSSピクセルサイズ) を決定する
        let displayWidth = canvas.logicalWidth;
        let displayHeight = canvas.logicalHeight;

        const wrapper = canvas.parentElement;
        if (wrapper) {
            const rect = wrapper.getBoundingClientRect();
            // パディング等（15px * 2 ＝ 30px）を考慮した利用可能な最大幅と高さ
            // ただし、値が0以下のときは無視する
            const wrapperWidth = Math.max(0, rect.width - 30);
            const wrapperHeight = Math.max(0, rect.height - 30);

            if (wrapperWidth > 0 && wrapperHeight > 0) {
                const targetRatio = canvas.logicalWidth / canvas.logicalHeight;
                const currentRatio = wrapperWidth / wrapperHeight;

                if (currentRatio > targetRatio) {
                    // 親要素が横長：高さいっぱいに合わせる
                    displayHeight = wrapperHeight;
                    displayWidth = wrapperHeight * targetRatio;
                } else {
                    // 親要素が縦長：幅いっぱいに合わせる
                    displayWidth = wrapperWidth;
                    displayHeight = wrapperWidth / targetRatio;
                }
            }
        }

        // 2. CSS表示サイズを設定
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        // 3. キャンバスの物理解像度（解像度）を表示サイズに完全に合わせる（DPRを掛ける）
        // これにより、画面上の1CSSピクセルに対して物理デバイスピクセルが等倍マッピングされ、ぼやけが無くなる
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;

        // 4. 論理座標 (1200x540) から物理ピクセルサイズへのスケール比率を計算
        const scaleX = (displayWidth * dpr) / canvas.logicalWidth;
        const scaleY = (displayHeight * dpr) / canvas.logicalHeight;

        // 描画スケールの設定（dprだけでなく、画面スケーリング比率も掛ける）
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(scaleX, scaleY);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // マップのレイアウト更新
        map.updateLayout(canvas.logicalWidth, canvas.logicalHeight);

        // 既存の敵ユニットのパス参照と座標を同期
        game.attackers.forEach(enemy => {
            enemy.path = map.paths[enemy.pathKey];
            const pos = getPointOnPath(enemy.path, enemy.progress);
            if (pos) {
                enemy.x = pos.x;
                enemy.y = pos.y;
            }
        });
    }

    // 初期起動時のレイアウト初期化
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ---- サイドバートグルはフローティング化に伴い廃止 ----

    let selectedStageId = 1;

    // 1.5. スタート画面からモード選択への遷移
    if (ui.dom.btnGameStart) {
        ui.dom.btnGameStart.addEventListener("click", () => {
            ui.hideModal(ui.dom.modalStartMenu);
            ui.showModal(ui.dom.modalStageSelect);

            // デフォルトでステージ1-1を選択状態にする
            selectedStageId = 1;
            ui.updateStageBriefing(selectedStageId);
            if (ui.dom.stageCards) {
                ui.dom.stageCards.forEach(c => {
                    if (parseInt(c.dataset.stage) === 1) {
                        c.classList.add("active");
                    } else {
                        c.classList.remove("active");
                    }
                });
            }
        });
    }
    if (ui.dom.btnEncyclopedia) {
        ui.dom.btnEncyclopedia.addEventListener("click", () => {
            alert("「図鑑」機能は現在準備中です。");
        });
    }
    if (ui.dom.btnOptions) {
        ui.dom.btnOptions.addEventListener("click", () => {
            alert("「オプション」機能は現在準備中です。");
        });
    }

    // 2. ステージ選択イベントの設定
    if (ui.dom.stageCards) {
        ui.dom.stageCards.forEach(card => {
            card.addEventListener("click", () => {
                if (card.classList.contains("locked") || card.classList.contains("dummy")) {
                    return;
                }

                ui.dom.stageCards.forEach(c => c.classList.remove("active"));
                card.classList.add("active");

                const stageId = parseInt(card.dataset.stage);
                selectedStageId = stageId;
                ui.updateStageBriefing(stageId);
            });
        });
    }

    if (ui.dom.btnStageBack) {
        ui.dom.btnStageBack.addEventListener("click", () => {
            ui.hideModal(ui.dom.modalStageSelect);
            ui.showModal(ui.dom.modalStartMenu);
        });
    }

    if (ui.dom.btnStageStart) {
        ui.dom.btnStageStart.addEventListener("click", () => {
            if (game.loadStage(selectedStageId)) {
                // トポロジーとスロットの初期化 (現在のキャンバスサイズにフィット)
                map.initializeTopology(canvas.logicalWidth, canvas.logicalHeight);
                ui.hideModal(ui.dom.modalStageSelect);
                ui.hideModal(ui.dom.modalStartMenu);
                ui.updateHUD();
                ui.log(`[ミッション開始] 「${game.stage.name}」を開始しました。予算: $${game.budget}`, "system");

                // ステージ読み込み成功後にウェーブ開始ボタンを有効化
                document.getElementById("btn-start-wave").disabled = false;

                // 初期の詳細パネル
                ui.showSelectionDetails(null);
                ui.resetPaletteTabs();
            }
        });
    }

    // 3. タワーパレット選択イベント
    const paletteButtons = document.querySelectorAll(".palette-item");
    paletteButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            // 他の選択を解除
            const towerType = btn.dataset.towerType;

            if (selectedPaletteTower === towerType) {
                // トグルオフ
                selectedPaletteTower = null;
                btn.classList.remove("selected");
                ui.showSelectionDetails(null);
            } else {
                paletteButtons.forEach(b => b.classList.remove("selected"));
                selectedPaletteTower = towerType;
                btn.classList.add("selected");
                ui.showDefenderShopDetails(towerType);
            }
        });

        // マウスホバーでグローバルポップアップツールチップのみを表示（右下説明欄は切り替えない）
        btn.addEventListener("mouseenter", () => {
            const towerType = btn.dataset.towerType;
            const info = ui.defenderInfo[towerType];
            if (info) {
                showGlobalTooltip(btn, `${info.name} (🪙 ${info.cost.toLocaleString()})`, info.desc, info.icon);
            }
        });
        btn.addEventListener("mouseleave", () => {
            hideGlobalTooltip();
        });

        // スマホタッチ対応: タッチされたらツールチップクラスを切り替える
        btn.addEventListener("touchstart", (e) => {
            const isCurrentlyActive = btn.classList.contains("touch-active");
            paletteButtons.forEach(b => b.classList.remove("touch-active"));
            if (!isCurrentlyActive) {
                btn.classList.add("touch-active");
            }
        }, { passive: true });
    });

    // 画面の他の箇所をタップした際にツールチップを消去
    document.addEventListener("touchstart", (e) => {
        if (!e.target.closest(".palette-item")) {
            paletteButtons.forEach(b => b.classList.remove("touch-active"));
        }

        // 攻撃手法項目 (threat-item) のスマホタッチ対応 (イベントデリゲーション)
        const threatItem = e.target.closest(".threat-item");
        const allThreatItems = document.querySelectorAll(".threat-item");
        if (threatItem) {
            const isCurrentlyActive = threatItem.classList.contains("touch-active");
            allThreatItems.forEach(item => item.classList.remove("touch-active"));
            if (!isCurrentlyActive) {
                threatItem.classList.add("touch-active");
            }
        } else {
            allThreatItems.forEach(item => item.classList.remove("touch-active"));
        }
    }, { passive: true });

    // カテゴリフィルタータブ切り替え時に選択状態をクリア
    document.querySelectorAll(".tab-btn").forEach(tab => {
        tab.addEventListener("click", () => {
            clearPaletteSelection();
            ui.showSelectionDetails(null);
        });
    });

    // 出現中の敵リストクリック＆ホバーイベント
    const activeThreatsList = document.getElementById("active-threats-list");
    if (activeThreatsList) {
        activeThreatsList.addEventListener("click", (e) => {
            const item = e.target.closest(".threat-list-item");
            if (item) {
                clearPaletteSelection();
                selectedSlot = null;
                hoveredNode = null;
                const type = item.dataset.threatType;
                ui.showThreatDetails(type);
            }
        });
        activeThreatsList.addEventListener("mouseover", (e) => {
            const item = e.target.closest(".threat-list-item");
            if (item) {
                const type = item.dataset.threatType;
                const info = ui.attackerInfo[type];
                if (info) {
                    showGlobalTooltip(item, info.name, info.desc, info.icon);
                }
            }
        });
        activeThreatsList.addEventListener("mouseout", (e) => {
            const item = e.target.closest(".threat-list-item");
            if (item) {
                hideGlobalTooltip();
            }
        });
    }

    // 次のウェーブプレビューアイコンのクリック＆ホバーイベント
    const nextWavePreviewIcons = document.getElementById("next-wave-preview-icons");
    if (nextWavePreviewIcons) {
        nextWavePreviewIcons.addEventListener("click", (e) => {
            const item = e.target.closest(".next-preview-icon");
            if (item) {
                clearPaletteSelection();
                selectedSlot = null;
                hoveredNode = null;
                const type = item.dataset.threatType;
                ui.showThreatDetails(type);
            }
        });
        nextWavePreviewIcons.addEventListener("mouseover", (e) => {
            const item = e.target.closest(".next-preview-icon");
            if (item) {
                const type = item.dataset.threatType;
                const info = ui.attackerInfo[type];
                if (info) {
                    showGlobalTooltip(item, info.name, info.desc, info.icon);
                }
            }
        });
        nextWavePreviewIcons.addEventListener("mouseout", (e) => {
            const item = e.target.closest(".next-preview-icon");
            if (item) {
                hideGlobalTooltip();
            }
        });
    }

    // グローバルツールチップ要素
    const globalTooltip = document.getElementById("global-tooltip");

    // グローバルポップアップツールチップ表示処理 (overflow切り取られ防止)
    function showGlobalTooltip(element, title, desc, icon = "") {
        if (!globalTooltip) return;

        globalTooltip.innerHTML = `
            <h5>${icon ? icon + " " : ""}${title}</h5>
            <p>${desc}</p>
        `;

        const rect = element.getBoundingClientRect();

        globalTooltip.style.display = "block";

        const tooltipRect = globalTooltip.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - 8;

        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 8;
        }

        globalTooltip.style.left = `${left}px`;
        globalTooltip.style.top = `${top}px`;
    }

    function hideGlobalTooltip() {
        if (globalTooltip) {
            globalTooltip.style.display = "none";
        }
    }


    // パレット選択をクリアするヘルパー
    function clearPaletteSelection() {
        selectedPaletteTower = null;
        paletteButtons.forEach(b => b.classList.remove("selected"));
    }

    // 4. マウスインタラクションイベント (Canvas)
    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        // スケール比率の考慮 (レスポンシブ対応)
        const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.logicalWidth;
        const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.logicalHeight;

        // スロットホバー検出
        const isMobileCanvas = canvas.logicalWidth < canvas.logicalHeight;
        const clickRadius = isMobileCanvas ? 32 : 18;
        let foundSlot = null;
        map.slots.forEach(slot => {
            const dist = Math.hypot(slot.x - mouseX, slot.y - mouseY);
            if (dist <= clickRadius) {
                foundSlot = slot;
            }
        });
        hoveredSlot = foundSlot;

        // ノードホバー検出 (クリック選択およびツールチップ用)
        let foundNode = null;
        map.nodes.forEach(node => {
            const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
            if (dist <= node.size) {
                foundNode = node;
            }
        });
        hoveredNode = foundNode;

        // 敵ユニットのホバー検出
        let foundEnemy = null;
        game.attackers.forEach(enemy => {
            const dist = Math.hypot(enemy.x - mouseX, enemy.y - mouseY);
            if (dist <= enemy.size + 10) {
                foundEnemy = enemy;
            }
        });

        canvas.style.cursor = (foundSlot || foundNode || foundEnemy) ? "pointer" : "default";
    });

    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.logicalWidth;
        const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.logicalHeight;

        // 0. 敵ユニットをクリックした場合
        let clickedEnemy = null;
        game.attackers.forEach(enemy => {
            const dist = Math.hypot(enemy.x - mouseX, enemy.y - mouseY);
            if (dist <= enemy.size + 10) {
                clickedEnemy = enemy;
            }
        });

        if (clickedEnemy) {
            clearPaletteSelection();
            selectedSlot = null;
            hoveredNode = null;
            ui.showThreatDetails(clickedEnemy.type);
            return;
        }

        // 1. スロットをクリックした場合
        const isMobileCanvas = canvas.logicalWidth < canvas.logicalHeight;
        const clickRadius = isMobileCanvas ? 32 : 18;
        let clickedSlot = null;
        map.slots.forEach(slot => {
            const dist = Math.hypot(slot.x - mouseX, slot.y - mouseY);
            if (dist <= clickRadius) {
                clickedSlot = slot;
            }
        });

        if (clickedSlot) {
            // パレットでタワーが選ばれていて、スロットが空の場合：配置処理
            if (selectedPaletteTower && !clickedSlot.tower) {
                // 仮のタワーを生成して価格を確認
                const tempDefender = new Defender(selectedPaletteTower, clickedSlot.x, clickedSlot.y, clickedSlot.parentNodeId, game);

                if (game.budget >= tempDefender.cost) {
                    game.budget -= tempDefender.cost;
                    clickedSlot.tower = tempDefender;
                    game.defenders.push(tempDefender);

                    // パッシブバフ（XDR射程強化等）の適用のため全タワー性能を再計算
                    game.defenders.forEach(d => d.initStats(game));

                    ui.log(`[配置] ${tempDefender.name} を ${map.getNodeById(clickedSlot.parentNodeId).name} 周辺に配置しました。`, "success");
                    game.effects.push(new FloatingText(`-$${tempDefender.cost}`, clickedSlot.x, clickedSlot.y - 10, "#ff0055"));

                    clearPaletteSelection();
                    ui.showSelectionDetails(null);
                    ui.updateHUD();
                } else {
                    ui.log(`[エラー] 予算が不足しています。必要: $${tempDefender.cost}`, "alert");
                    game.effects.push(new FloatingText("予算不足!", clickedSlot.x, clickedSlot.y - 10, "#ff0055"));
                }
            } else {
                // 単なる選択表示
                selectedSlot = clickedSlot;
                ui.showSelectionDetails(clickedSlot);
            }
            return;
        }

        // 2. ノード（サーバー）をクリックした場合
        let clickedNode = null;
        map.nodes.forEach(node => {
            const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
            if (dist <= node.size) {
                clickedNode = node;
            }
        });

        if (clickedNode) {
            selectedSlot = null;
            hoveredNode = clickedNode; // スマホでのタップ表示用
            ui.showSelectionDetails(clickedNode);
            return;
        }

        // 何もないところをクリックした場合：選択解除
        selectedSlot = null;
        hoveredNode = null;
        ui.showSelectionDetails(null);
    });

    // Canvas タッチ操作（スマートフォン/タブレット用）
    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        // タッチ座標をキャンバス論理座標に変換してクリックと同様に処理
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const mouseX = ((touch.clientX - rect.left) / rect.width) * canvas.logicalWidth;
        const mouseY = ((touch.clientY - rect.top) / rect.height) * canvas.logicalHeight;

        // 0. 敵ユニットをタップした場合
        let clickedEnemy = null;
        game.attackers.forEach(enemy => {
            const dist = Math.hypot(enemy.x - mouseX, enemy.y - mouseY);
            // タッチ用に判定範囲を広めに取る (size + 20)
            if (dist <= enemy.size + 20) {
                clickedEnemy = enemy;
            }
        });

        if (clickedEnemy) {
            clearPaletteSelection();
            selectedSlot = null;
            hoveredNode = null;
            ui.showThreatDetails(clickedEnemy.type);
            return;
        }

        // 1. スロットの判定
        let clickedSlot = null;
        map.slots.forEach(slot => {
            const dist = Math.hypot(slot.x - mouseX, slot.y - mouseY);
            // タッチ用に判定範囲を少し広めに取る
            if (dist <= slot.radius * 1.5) {
                clickedSlot = slot;
            }
        });

        if (clickedSlot) {
            if (selectedPaletteTower && !clickedSlot.tower) {
                const tempDefender = new Defender(selectedPaletteTower, clickedSlot.x, clickedSlot.y, clickedSlot.parentNodeId, game);
                if (game.budget >= tempDefender.cost) {
                    game.budget -= tempDefender.cost;
                    clickedSlot.tower = tempDefender;
                    game.defenders.push(tempDefender);

                    // パッシブバフ（XDR射程強化等）の適用のため全タワー性能を再計算
                    game.defenders.forEach(d => d.initStats(game));

                    ui.log(`[配置] ${tempDefender.name} を ${map.getNodeById(clickedSlot.parentNodeId).name} 周辺に配置しました。`, "success");
                    game.effects.push(new FloatingText(`-$${tempDefender.cost}`, clickedSlot.x, clickedSlot.y - 10, "#ff0055"));
                    clearPaletteSelection();
                    ui.showSelectionDetails(null);
                    ui.updateHUD();
                } else {
                    ui.log(`[エラー] 予算が不足しています。必要: $${tempDefender.cost}`, "alert");
                    game.effects.push(new FloatingText("予算不足!", clickedSlot.x, clickedSlot.y - 10, "#ff0055"));
                }
            } else {
                selectedSlot = clickedSlot;
                ui.showSelectionDetails(clickedSlot);
            }
            return;
        }

        // ノードのタップ判定
        let clickedNode = null;
        map.nodes.forEach(node => {
            const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
            if (dist <= node.size * 1.4) {
                clickedNode = node;
            }
        });

        if (clickedNode) {
            selectedSlot = null;
            hoveredNode = clickedNode;
            ui.showSelectionDetails(clickedNode);
            return;
        }

        // 何もないところをタップした場合：選択解除
        selectedSlot = null;
        hoveredNode = null;
        ui.showSelectionDetails(null);
    }, { passive: false });

    // 5. ゲームのメインアップデート＆描画ループ
    function gameLoop(time) {
        const delta = time - lastTime;
        lastTime = time;

        // ゲーム速度補正
        const currentSpeed = game.speed;

        if (game.status === "playing" && currentSpeed > 0) {
            // 敵のスポーンスケジュール処理
            if (game.waveInProgress && game.spawnQueue.length > 0) {
                // 壁時計時間ではなく、実際のゲーム内進行時間を加算
                game.waveActiveTime += delta * currentSpeed;
                const elapsedSinceWaveStart = game.waveActiveTime;

                // 出現時刻に達した敵を生成
                while (game.spawnQueue.length > 0 && game.spawnQueue[0].spawnTime <= elapsedSinceWaveStart) {
                    const nextSpawn = game.spawnQueue.shift();

                    // 攻撃タイプに応じた移動パスの割り当て
                    let pathKey = "webRoute";
                    if (nextSpawn.type === "bruteforce") {
                        pathKey = "authRoute";
                    } else if (nextSpawn.type === "phishing") {
                        pathKey = Math.random() > 0.5 ? "webRoute" : "authRoute";
                    } else if (nextSpawn.type === "sqlinjection") {
                        pathKey = "webRoute";
                    } else if (nextSpawn.type === "ransomware") {
                        pathKey = Math.random() > 0.4 ? "authRoute" : "crossRoute";
                    } else if (nextSpawn.type === "apt") {
                        pathKey = "crossRoute";
                    } else if (nextSpawn.type === "insider") {
                        pathKey = Math.random() > 0.5 ? "authRoute" : "webRoute";
                    }

                    const newEnemy = new Attacker(nextSpawn.type, pathKey, map);
                    game.attackers.push(newEnemy);
                    ui.log(`[検知] 侵入イベント: ${newEnemy.name} (キルチェーン: 侵入)`, "warn");
                }
            }

            // 粒子の移動更新
            map.update(delta, currentSpeed);

            // リソース・インシデント停止時間の更新
            game.updateResources(delta);

            // 攻撃者の更新
            for (let i = game.attackers.length - 1; i >= 0; i--) {
                const enemy = game.attackers[i];
                enemy.update(delta, game);

                // 到達または死亡した敵のクリーンアップ
                if (enemy.status === "success" || enemy.status === "dead") {
                    game.attackers.splice(i, 1);
                    ui.updateHUD();
                }
            }

            // 防御モジュールの更新
            game.defenders.forEach(def => {
                def.update(delta, game);
            });

            // 手動人員による復旧の処理
            map.nodes.forEach(node => {
                if (node.status === "infected" && node.isStaffAssigned) {
                    // 人員による復旧（毎秒 15% の復旧スピード）
                    node.recoveryProgress += 12 * (delta / 1000) * currentSpeed;

                    if (node.recoveryProgress >= 100) {
                        node.status = "nominal";
                        node.recoveryProgress = 0;
                        node.isStaffAssigned = false;
                        game.staffUsed--; // 人員の解放

                        ui.updateHUD();
                        ui.showSelectionDetails(node); // パネル表示更新
                        ui.log(`[緊急対応] ${node.name} の復旧がセキュリティ要員により完了しました。`, "success");
                        game.effects.push(new FloatingText("復旧完了!", node.x, node.y, "#39ff14"));

                        // サーバー復旧に伴うタワーパッシブの再計算
                        game.defenders.forEach(d => d.initStats(game));
                    }
                }
            });

            // 浮遊テキスト/エフェクトの更新
            for (let i = game.effects.length - 1; i >= 0; i--) {
                const effect = game.effects[i];
                if (!effect.update(delta, game)) {
                    game.effects.splice(i, 1);
                }
            }

            // ウェーブクリアおよびステージクリア判定
            game.checkWaveCompletion();

            // 勝利・敗北のステータス遷移
            if (game.status === "over") {
                ui.showGameEndScreen(false);
            } else if (game.status === "victory") {
                ui.showGameEndScreen(true);
            }

            // 定期的なHUDの更新
            ui.updateHUD();
        }

        // 描画ループの実行
        drawCanvas();

        requestAnimationFrame(gameLoop);
    }

    // Canvas全体の描画
    function drawCanvas() {
        // キャンバスのクリア
        ctx.fillStyle = "#020308";
        ctx.fillRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);

        // 1. マップ（ノード・スロット）および背景の描画
        map.draw(ctx, hoveredSlot, selectedSlot, selectedPaletteTower);

        // 2. タワー配置プレビュー射程円の描画
        // パレットで選択されており、かつ空きスロットにホバーしている場合
        if (selectedPaletteTower && hoveredSlot && !hoveredSlot.tower) {
            const tempDef = new Defender(selectedPaletteTower, hoveredSlot.x, hoveredSlot.y, hoveredSlot.parentNodeId, game);

            ctx.save();
            ctx.fillStyle = "rgba(0, 240, 255, 0.04)";
            ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);

            ctx.beginPath();
            ctx.arc(hoveredSlot.x, hoveredSlot.y, tempDef.range, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 3. 選択されているタワーの射程サークル描画
        if (selectedSlot && selectedSlot.tower) {
            ctx.save();
            ctx.fillStyle = "rgba(255, 204, 0, 0.03)";
            ctx.strokeStyle = "rgba(255, 204, 0, 0.25)";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);

            ctx.beginPath();
            ctx.arc(selectedSlot.x, selectedSlot.y, selectedSlot.tower.range, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 5. 防御タワーのレーザービーム描画 (敵やサーバーの上に重なる)
        game.defenders.forEach(def => {
            def.drawLaser(ctx);
        });

        // 6. 攻撃者の描画
        game.attackers.forEach(enemy => {
            enemy.draw(ctx);
        });

        // 7. エフェクト・ポップアップテキストの描画
        game.effects.forEach(effect => {
            effect.draw(ctx);
        });

        // 8. ホバーされているノードの説明ツールチップを描画
        if (hoveredNode) {
            drawNodeTooltip(ctx, hoveredNode);
        }
    }

    // ノード用の説明ツールチップ（吹き出し）描画
    function drawNodeTooltip(ctx, node) {
        ctx.save();

        const title = node.name;
        const text = node.description;
        const tooltipWidth = 280;
        const padding = 12;

        ctx.font = "12px 'Share Tech Mono', sans-serif";

        // 1行の最大幅を超えたら改行するロジック（文字単位で判定）
        const words = text.split("");
        let lines = [];
        let currentLine = "";

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > tooltipWidth - padding * 2 && i > 0) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        const lineHeight = 16;
        const tooltipHeight = 35 + lines.length * lineHeight;

        // 表示位置（ノードの真上）- 座標を整数値に丸める
        let x = Math.round(node.x - tooltipWidth / 2);
        let y = Math.round(node.y - node.size - tooltipHeight - 15);

        // 画面外はみ出し防止
        if (x < 10) x = 10;
        if (x + tooltipWidth > canvas.logicalWidth - 10) x = Math.round(canvas.logicalWidth - tooltipWidth - 10);
        if (y < 10) y = Math.round(node.y + node.size + 15); // 上にはみ出る場合は下に表示

        // 背景と枠の描画
        ctx.fillStyle = "rgba(8, 10, 24, 0.95)";
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#00f0ff";

        drawRoundRect(ctx, x, y, tooltipWidth, tooltipHeight, 6);

        // テキストの影は消す
        ctx.shadowBlur = 0;

        // タイトルの描画
        ctx.fillStyle = "#00f0ff";
        ctx.font = "bold 13px 'Share Tech Mono', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(title, Math.round(x + padding), Math.round(y + padding + 10));

        // 区切り線
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.beginPath();
        ctx.moveTo(Math.round(x + padding), Math.round(y + 26));
        ctx.lineTo(Math.round(x + tooltipWidth - padding), Math.round(y + 26));
        ctx.stroke();

        // 本文の描画
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "11px 'Outfit', sans-serif";
        lines.forEach((line, index) => {
            ctx.fillText(line, Math.round(x + padding), Math.round(y + 43 + index * lineHeight));
        });

        ctx.restore();
    }

    // 角丸四角形描画ユーティリティ
    function drawRoundRect(ctx, x, y, w, h, r) {
        const rx = Math.round(x);
        const ry = Math.round(y);
        const rw = Math.round(w);
        const rh = Math.round(h);
        const rr = Math.round(r);
        ctx.beginPath();
        ctx.moveTo(rx + rr, ry);
        ctx.lineTo(rx + rw - rr, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
        ctx.lineTo(rx + rw, ry + rh - rr);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
        ctx.lineTo(rx + rr, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
        ctx.lineTo(rx, ry + rr);
        ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // ゲームループ開始
    requestAnimationFrame(gameLoop);

    // フォント読み込み完了後にキャンバスを再描画してレイアウトを最適化
    document.fonts.ready.then(() => {
        resizeCanvas();
    });
});
