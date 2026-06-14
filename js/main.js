/* Cyber Defense Architect - Main Entry Point & Game Loop */

import { GameState } from './game.js';
import { NetworkMap, getPointOnPath } from './map.js';
import { UIManager } from './ui.js';
import { TechTree } from './tech.js';
import { Attacker, Defender, FloatingText } from './units.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. 各システムのインスタンス化
    const game = new GameState();
    const map = new NetworkMap();
    game.map = map;

    const ui = new UIManager(game);
    game.ui = ui;

    const techTree = new TechTree(game);
    game.techTree = techTree;

    // キャンバスコンテキスト
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");

    // UIインタラクション状態
    let selectedPaletteTower = null; // パレットで選択されたタワータイプ名
    let hoveredSlot = null;
    let selectedSlot = null;
    let hoveredNode = null; // ホバー（またはタップ）されたノードオブジェクト
    let lastTime = performance.now();

    // Canvasのリサイズとレイアウト更新処理
    function resizeCanvas() {
        const wrapper = canvas.parentElement;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // マップのレイアウト更新
        map.updateLayout(canvas.width, canvas.height);

        // 既存の敵ユニットのパス参照と座標をリサイズ後のマップに同期
        game.attackers.forEach(enemy => {
            enemy.path = map.paths[enemy.pathKey];
            const pos = getPointOnPath(enemy.path, enemy.progress);
            if (pos) {
                enemy.x = pos.x;
                enemy.y = pos.y;
            }
        });
    }

    // 初期起動時のリサイズ
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ---- サイドバートグルはフローティング化に伴い廃止 ----

    // 2. ステージ選択イベントの設定
    document.querySelectorAll(".stage-card").forEach(card => {
        card.addEventListener("click", () => {
            const stageId = parseInt(card.dataset.stage);
            if (game.loadStage(stageId)) {
                // トポロジーとスロットの初期化 (現在のキャンバスサイズにフィット)
                map.initializeTopology(canvas.width, canvas.height);
                ui.hideModal(ui.dom.modalStageSelect);
                ui.updateHUD();
                ui.log(`[ミッション開始] 「${game.stage.name}」を開始しました。予算: $${game.budget}`, "system");

                // 初期の詳細パネル
                ui.showSelectionDetails(null);
            }
        });
    });

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
            } else {
                paletteButtons.forEach(b => b.classList.remove("selected"));
                selectedPaletteTower = towerType;
                btn.classList.add("selected");
            }
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

    // パレット選択をクリアするヘルパー
    function clearPaletteSelection() {
        selectedPaletteTower = null;
        paletteButtons.forEach(b => b.classList.remove("selected"));
    }

    // 4. マウスインタラクションイベント (Canvas)
    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        // スケール比率の考慮 (レスポンシブ対応)
        const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

        // スロットホバー検出
        let foundSlot = null;
        map.slots.forEach(slot => {
            const dist = Math.hypot(slot.x - mouseX, slot.y - mouseY);
            if (dist <= slot.radius) {
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
        canvas.style.cursor = (foundSlot || foundNode) ? "pointer" : "default";
    });

    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

        // 1. スロットをクリックした場合
        let clickedSlot = null;
        map.slots.forEach(slot => {
            const dist = Math.hypot(slot.x - mouseX, slot.y - mouseY);
            if (dist <= slot.radius) {
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

                    ui.log(`[配置] ${tempDefender.name} を ${map.getNodeById(clickedSlot.parentNodeId).name} 周辺に配置しました。`, "success");
                    game.effects.push(new FloatingText(`-$${tempDefender.cost}`, clickedSlot.x, clickedSlot.y - 10, "#ff0055"));

                    clearPaletteSelection();
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
        const mouseX = ((touch.clientX - rect.left) / rect.width) * canvas.width;
        const mouseY = ((touch.clientY - rect.top) / rect.height) * canvas.height;

        // スロットの判定
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
                    ui.log(`[配置] ${tempDefender.name} を ${map.getNodeById(clickedSlot.parentNodeId).name} 周辺に配置しました。`, "success");
                    game.effects.push(new FloatingText(`-$${tempDefender.cost}`, clickedSlot.x, clickedSlot.y - 10, "#ff0055"));
                    clearPaletteSelection();
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
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. 背景グリッドは廃止（画像背景に置き換え）

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

        // 4. マップ（ノード・スロット）の描画
        map.draw(ctx, hoveredSlot, selectedSlot);

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

        // 表示位置（ノードの真上）
        let x = node.x - tooltipWidth / 2;
        let y = node.y - node.size - tooltipHeight - 15;

        // 画面外はみ出し防止
        if (x < 10) x = 10;
        if (x + tooltipWidth > canvas.width - 10) x = canvas.width - tooltipWidth - 10;
        if (y < 10) y = node.y + node.size + 15; // 上にはみ出る場合は下に表示

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
        ctx.fillText(title, x + padding, y + padding + 10);

        // 区切り線
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.beginPath();
        ctx.moveTo(x + padding, y + 26);
        ctx.lineTo(x + tooltipWidth - padding, y + 26);
        ctx.stroke();

        // 本文の描画
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "11px 'Outfit', sans-serif";
        lines.forEach((line, index) => {
            ctx.fillText(line, x + padding, y + 43 + index * lineHeight);
        });

        ctx.restore();
    }

    // 角丸四角形描画ユーティリティ
    function drawRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // ゲームループ開始
    requestAnimationFrame(gameLoop);
});
