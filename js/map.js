/* Cyber Defense Architect - Network Topology & Canvas Rendering */

export class Node {
    constructor(id, name, type, x, y, size = 30) {
        this.id = id;
        this.name = name;
        this.type = type; // internet, dmz, web, auth, db, file, data
        this.x = x;
        this.y = y;
        this.size = size;
        this.status = "nominal"; // nominal (正常), infected (ランサム感染), offline (機能停止)

        // ノード固有のリソース（停止時間など）
        this.infectionProgress = 0; // 0 to 100
        this.recoveryProgress = 0; // 0 to 100
        this.maxShield = 100;
        this.shield = 100; // ノードのバリア値
        this.description = this.getDescriptionByType(type);
    }

    getDescriptionByType(type) {
        switch(type) {
            case "internet": return "外部インターネット：外部ネットワーク。サイバー攻撃の発信源となる場所。防衛モジュールは配置できません。";
            case "dmz": return "DMZゲートウェイ：外部と内部ネットワークの境界で、通信を中継・監視する最初の砦。Firewallが効果的。";
            case "web": return "WEBサーバー：外部公開されたWebサーバー。SQLインジェクション脆弱性攻撃などの標的になりやすい。WAFで保護可能。";
            case "auth": return "認証サーバー：アカウントの認証情報を管理。ブルートフォース攻撃で乗っ取られやすいため、MFAで防衛します。";
            case "db": return "データベース：機密データを蓄積する。WEB経由のSQLインジェクションで窃取されるリスクがあり、WAFやEDRで守ります。";
            case "file": return "ファイルサーバー：社員用共有サーバー。ランサムウェア等の感染標的になりやすいため、EDRやバックアップが必須。";
            case "data": return "最重要機密データ：組織の最も重要なアセット。攻撃者がここに達すると重大な情報漏洩（ゲーム敗北）となります。";
            default: return "組織内の重要システム。";
        }
    }

    draw(ctx, time) {
        ctx.save();

        // 状態に応じたネオンカラーの決定
        let color = "#00f0ff"; // neon-blue
        let glowColor = "rgba(0, 240, 255, 0.4)";
        let pulseSpeed = 2000;

        if (this.type === "internet") {
            color = "#bd00ff"; // neon-purple
            glowColor = "rgba(189, 0, 255, 0.4)";
        } else if (this.type === "data") {
            color = "#ffcc00"; // neon-gold
            glowColor = "rgba(255, 204, 0, 0.4)";
        }

        if (this.status === "infected") {
            color = "#ff0055"; // neon-red
            glowColor = "rgba(255, 0, 85, 0.6)";
            pulseSpeed = 500; // 高速明滅
        } else if (this.status === "offline") {
            color = "#475569"; // 暗いグレー
            glowColor = "rgba(71, 85, 105, 0.1)";
        }

        // 光る脈動エフェクト
        const pulse = 1 + Math.sin(time / pulseSpeed) * 0.1;
        const radius = this.size * pulse;

        // ドロップシャドウ/グロー
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        // 外側のリング
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 内側の塗りつぶし
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(13, 20, 44, 0.8)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius - 4, 0, Math.PI * 2);
        ctx.fill();

        // ノードのコア
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // ノードの名前
        ctx.shadowBlur = 5;
        ctx.shadowColor = color;
        ctx.fillStyle = "#fff";
        ctx.font = "14px 'Share Tech Mono'";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - this.size - 10);

        // ステータス表示
        if (this.status === "infected") {
            ctx.fillStyle = varColor("neon-red");
            ctx.font = "12px 'Share Tech Mono'";
            ctx.fillText("⚠️ CRITICAL INFECTED", this.x, this.y + this.size + 18);

            // 復旧プログレスバー
            if (this.recoveryProgress > 0) {
                drawProgressBar(ctx, this.x - 25, this.y + this.size + 24, 50, 5, this.recoveryProgress / 100, "#39ff14");
            }
        } else if (this.status === "offline") {
            ctx.fillStyle = "#64748b";
            ctx.font = "12px 'Share Tech Mono'";
            ctx.fillText("❌ OFFLINE", this.x, this.y + this.size + 18);
        } else {
            // シールド値（NOMINAL時）
            if (this.shield < this.maxShield) {
                drawProgressBar(ctx, this.x - 25, this.y + this.size + 18, 50, 5, this.shield / this.maxShield, "#00f0ff");
            }
        }

        ctx.restore();
    }
}

// スロットクラス (防御タワーを配置する場所)
export class Slot {
    constructor(id, offsetX, offsetY, parentNodeId) {
        this.id = id;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.parentNodeId = parentNodeId; // どのノードを保護するスロットか
        this.x = 0; // レイアウト更新時に設定される
        this.y = 0;
        this.tower = null; // 配置されたタワーオブジェクト
        this.radius = 18;
    }

    updatePosition(parentX, parentY) {
        this.x = parentX + this.offsetX;
        this.y = parentY + this.offsetY;
        if (this.tower) {
            this.tower.x = this.x;
            this.tower.y = this.y;
        }
    }

    draw(ctx, isHovered, isSelected) {
        ctx.save();

        if (this.tower) {
            this.tower.draw(ctx);
        } else {
            // 空きスロットの描画
            ctx.setLineDash([4, 2]);
            ctx.lineWidth = 1.5;

            if (isHovered) {
                ctx.strokeStyle = "#00ffd5"; // neon-cyan
                ctx.shadowBlur = 8;
                ctx.shadowColor = "#00ffd5";
                ctx.fillStyle = "rgba(0, 255, 213, 0.1)";
            } else {
                ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
                ctx.fillStyle = "rgba(0, 240, 255, 0.02)";
            }

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // スロット中心の + 印
            ctx.strokeStyle = isHovered ? "#00ffd5" : "rgba(0, 240, 255, 0.3)";
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x - 4, this.y);
            ctx.lineTo(this.x + 4, this.y);
            ctx.moveTo(this.x, this.y - 4);
            ctx.lineTo(this.x, this.y + 4);
            ctx.stroke();
        }

        if (isSelected) {
            // 選択中の外枠
            ctx.strokeStyle = "#ffcc00"; // neon-gold
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ffcc00";
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

export class NetworkMap {
    constructor() {
        this.nodes = [];
        this.slots = [];
        this.paths = []; // 攻撃者が通るメインのパス定義
        this.dataPulses = []; // パルスアニメーション用の粒子配列

        this.bgImage = new Image();
        this.bgImage.src = "images/map_bg.png";

        this.initializeTopology();
    }

    initializeTopology(width = 1200, height = 540) {
        // 1. ノードの定義 (x, y 座標は仮置き、後で updateLayout で比率計算される)
        this.nodes = [
            new Node("internet", "INTERNET", "internet", 0, 0, 25),
            new Node("dmz", "DMZ GW", "dmz", 0, 0, 28),
            new Node("web", "WEB SERVER", "web", 0, 0, 30),
            new Node("auth", "AUTH SERVER", "auth", 0, 0, 30),
            new Node("db", "DB SERVER", "db", 0, 0, 30),
            new Node("file", "FILE SERVER", "file", 0, 0, 30),
            new Node("data", "CRITICAL DATA", "data", 0, 0, 25)
        ];

        // 2. タワースロットの定義 (ノード中心からの相対オフセットを保持)
        this.slots = [
            // DMZ周辺 (主にFirewall等)
            new Slot("s-dmz-1", -50, -60, "dmz"),
            new Slot("s-dmz-2", -50, 60, "dmz"),
            new Slot("s-dmz-3", 40, -60, "dmz"),

            // Web Server周辺 (主にWAF等)
            new Slot("s-web-1", -55, -50, "web"),
            new Slot("s-web-2", 55, -50, "web"),
            new Slot("s-web-3", 0, 60, "web"),

            // Auth Server周辺 (主にMFA等)
            new Slot("s-auth-1", -55, 60, "auth"),
            new Slot("s-auth-2", 55, 60, "auth"),
            new Slot("s-auth-3", 0, -60, "auth"),

            // DB Server周辺 (主にWAF, EDR)
            new Slot("s-db-1", -55, -50, "db"),
            new Slot("s-db-2", 55, -50, "db"),
            new Slot("s-db-3", 0, 60, "db"),

            // File Server周辺 (主にEDR, Backup)
            new Slot("s-file-1", -55, 60, "file"),
            new Slot("s-file-2", 55, 60, "file"),
            new Slot("s-file-3", 0, -60, "file")
        ];

        this.paths = { webRoute: [], authRoute: [], crossRoute: [] };

        // 座標とパスを決定
        this.updateLayout(width, height);

        // パルス粒子の初期設定 (すでに生成されている場合は二重生成を防ぐ)
        if (this.dataPulses.length === 0) {
            for (let i = 0; i < 15; i++) {
                this.dataPulses.push({
                    pathKey: Math.random() > 0.5 ? "webRoute" : "authRoute",
                    progress: Math.random(), // 0 to 1
                    speed: 0.05 + Math.random() * 0.05,
                    color: "rgba(0, 240, 255, 0.4)"
                });
            }
        }
    }

    updateLayout(width, height) {
        // ノード座標を参照するヘルパー
        const getP = (id) => this.getNodeById(id);

        // 1. ノード座標を比率で更新
        this.nodes.forEach(node => {
            switch (node.id) {
                case "internet":
                    node.x = width * 0.07;
                    node.y = height * 0.5;
                    break;
                case "dmz":
                    node.x = width * 0.21;
                    node.y = height * 0.5;
                    break;
                case "web":
                    node.x = width * 0.38;
                    node.y = height * 0.3;
                    break;
                case "auth":
                    node.x = width * 0.52;
                    node.y = height * 0.6;
                    break;
                case "db":
                    node.x = width * 0.67;
                    node.y = height * 0.3;
                    break;
                case "file":
                    node.x = width * 0.81;
                    node.y = height * 0.6;
                    break;
                case "data":
                    node.x = width * 0.93;
                    node.y = height * 0.5;
                    break;
            }
        });

        // 2. スロット座標の更新
        this.slots.forEach(slot => {
            const parentNode = getP(slot.parentNodeId);
            if (parentNode) {
                slot.updatePosition(parentNode.x, parentNode.y);
            }
        });

        // 3. パス(経路)の更新
        this.paths.webRoute = [
            { x: getP("internet").x, y: getP("internet").y, node: "internet" },
            { x: getP("dmz").x, y: getP("dmz").y, node: "dmz" },
            { x: getP("web").x, y: getP("web").y, node: "web" },
            { x: getP("db").x, y: getP("db").y, node: "db" },
            { x: getP("data").x, y: getP("data").y, node: "data" }
        ];
        this.paths.authRoute = [
            { x: getP("internet").x, y: getP("internet").y, node: "internet" },
            { x: getP("dmz").x, y: getP("dmz").y, node: "dmz" },
            { x: getP("auth").x, y: getP("auth").y, node: "auth" },
            { x: getP("file").x, y: getP("file").y, node: "file" },
            { x: getP("data").x, y: getP("data").y, node: "data" }
        ];
        this.paths.crossRoute = [
            { x: getP("internet").x, y: getP("internet").y, node: "internet" },
            { x: getP("dmz").x, y: getP("dmz").y, node: "dmz" },
            { x: getP("web").x, y: getP("web").y, node: "web" },
            { x: getP("auth").x, y: getP("auth").y, node: "auth" },
            { x: getP("file").x, y: getP("file").y, node: "file" },
            { x: getP("data").x, y: getP("data").y, node: "data" }
        ];
    }

    getNodeById(id) {
        return this.nodes.find(n => n.id === id);
    }

    getSlotById(id) {
        return this.slots.find(s => s.id === id);
    }

    update(delta, speed) {
        const time = Date.now();
        // パルスアニメーションの更新
        this.dataPulses.forEach(pulse => {
            pulse.progress += (pulse.speed * (delta / 1000)) * speed;
            if (pulse.progress >= 1) {
                pulse.progress = 0;
                pulse.pathKey = Math.random() > 0.5 ? "webRoute" : "authRoute";
            }
        });
    }

    draw(ctx, hoveredSlot, selectedSlot) {
        const time = Date.now();
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // 1. 背景画像の描画
        if (this.bgImage.complete) {
            ctx.drawImage(this.bgImage, 0, 0, w, h);
        } else {
            ctx.fillStyle = "#020308";
            ctx.fillRect(0, 0, w, h);
        }

        // 2. 7つのカラーゾーンとゾーンタブの描画
        const zones = [
            { name: "インターネット", color: "rgba(189, 0, 255, 0.07)", borderColor: "rgba(189, 0, 255, 0.25)", textColor: "#bd00ff" },
            { name: "DMZ", color: "rgba(0, 70, 255, 0.07)", borderColor: "rgba(0, 70, 255, 0.25)", textColor: "#00a2ff" },
            { name: "Webサーバー", color: "rgba(0, 200, 255, 0.07)", borderColor: "rgba(0, 200, 255, 0.25)", textColor: "#00f0ff" },
            { name: "アプリサーバー", color: "rgba(57, 255, 20, 0.05)", borderColor: "rgba(57, 255, 20, 0.2)", textColor: "#39ff14" },
            { name: "認証・AD", color: "rgba(255, 204, 0, 0.05)", borderColor: "rgba(255, 204, 0, 0.2)", textColor: "#ffcc00" },
            { name: "社内ネットワーク", color: "rgba(255, 120, 0, 0.05)", borderColor: "rgba(255, 120, 0, 0.2)", textColor: "#ff7800" },
            { name: "機密情報・データ", color: "rgba(255, 0, 85, 0.07)", borderColor: "rgba(255, 0, 85, 0.25)", textColor: "#ff0055" }
        ];

        const zoneW = w / 7;
        ctx.save();
        for (let i = 0; i < 7; i++) {
            const zX = i * zoneW;

            // ゾーン縦帯のグラデーション塗りつぶし (上部が少し濃く、下部へ向けてフェードアウト)
            const zoneGrad = ctx.createLinearGradient(zX, 0, zX, h);
            const baseOpacity = zones[i].color.includes("0.07") ? "0.10" : "0.08";
            zoneGrad.addColorStop(0, zones[i].color.replace("0.07", baseOpacity).replace("0.05", baseOpacity));
            zoneGrad.addColorStop(0.3, zones[i].color.replace("0.07", "0.03").replace("0.05", "0.02"));
            zoneGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = zoneGrad;
            ctx.fillRect(zX, 0, zoneW, h);

            // 境界線（右端のみ描画。最後のゾーンは描かない。上部が明るく下部が消えるグラデーション点線）
            if (i < 6) {
                const borderGrad = ctx.createLinearGradient(zX + zoneW, 0, zX + zoneW, h);
                borderGrad.addColorStop(0, zones[i].borderColor);
                borderGrad.addColorStop(0.7, zones[i].borderColor.replace("0.25", "0.05").replace("0.2", "0.03"));
                borderGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

                ctx.strokeStyle = borderGrad;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(zX + zoneW, 0);
                ctx.lineTo(zX + zoneW, h);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // ゾーンタブの描画（画面上部）
            const tabMargin = 8;
            const tabH = 22;
            const tabY = 15;
            const tabW = zoneW - tabMargin * 2;
            const tabX = zX + tabMargin;

            // 斜めのタブ（平行四辺形風）
            ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
            ctx.strokeStyle = zones[i].textColor;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 4;
            ctx.shadowColor = zones[i].textColor;
            ctx.beginPath();
            ctx.moveTo(tabX + 8, tabY);
            ctx.lineTo(tabX + tabW, tabY);
            ctx.lineTo(tabX + tabW - 8, tabY + tabH);
            ctx.lineTo(tabX, tabY + tabH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // タブのテキスト
            ctx.fillStyle = "#fff";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(zones[i].name, tabX + tabW / 2, tabY + tabH / 2 + 1);
        }
        ctx.restore();

        // 2.5 攻撃の進行ルートの描画 (グロー効果＋流れるような赤い点線レーザー)
        ctx.save();
        const drawPathRoute = (route) => {
            if (!route || route.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(route[0].x, route[0].y);
            for (let i = 1; i < route.length; i++) {
                ctx.lineTo(route[i].x, route[i].y);
            }
            ctx.stroke();
        };

        // パス1: 下地の光るグロー
        ctx.strokeStyle = "rgba(255, 0, 85, 0.12)";
        ctx.lineWidth = 4.0;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#ff0055";
        drawPathRoute(this.paths.webRoute);
        drawPathRoute(this.paths.authRoute);
        drawPathRoute(this.paths.crossRoute);

        // パス2: 動く点線レーザー（グローなしでクッキリ）
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 0, 85, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -Math.floor(time / 20) % 28;
        drawPathRoute(this.paths.webRoute);
        drawPathRoute(this.paths.authRoute);
        drawPathRoute(this.paths.crossRoute);
        ctx.restore();

        // 3. パス(接続線)の描画
        ctx.save();
        ctx.lineWidth = 1.5;

        // ネットワーク接続関係の線を描画
        const drawLink = (n1, n2) => {
            const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
            let c1 = "rgba(0, 240, 255, 0.15)";
            let c2 = "rgba(0, 240, 255, 0.15)";

            if (n1.status === "infected" || n2.status === "infected") {
                c1 = "rgba(255, 0, 85, 0.25)";
                c2 = "rgba(255, 0, 85, 0.25)";
            }
            grad.addColorStop(0, c1);
            grad.addColorStop(1, c2);

            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
        };

        const internetNode = this.getNodeById("internet");
        const dmzNode = this.getNodeById("dmz");
        const webNode = this.getNodeById("web");
        const authNode = this.getNodeById("auth");
        const dbNode = this.getNodeById("db");
        const fileNode = this.getNodeById("file");
        const dataNode = this.getNodeById("data");

        drawLink(internetNode, dmzNode);
        drawLink(dmzNode, webNode);
        drawLink(dmzNode, authNode);
        drawLink(webNode, dbNode);
        drawLink(authNode, fileNode);
        drawLink(dbNode, dataNode);
        drawLink(fileNode, dataNode);
        drawLink(dbNode, fileNode); // クロス接続

        ctx.restore();

        // 2. パルス粒子の描画 (データの流れを視覚化)
        ctx.save();
        this.dataPulses.forEach(pulse => {
            const route = this.paths[pulse.pathKey];
            const pos = getPointOnPath(route, pulse.progress);
            if (pos) {
                ctx.fillStyle = pulse.color;
                ctx.shadowBlur = 6;
                ctx.shadowColor = "#00f0ff";
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        // 3. ノードの描画
        this.nodes.forEach(node => {
            node.draw(ctx, time);
        });

        // 4. スロット(およびタワー)の描画
        this.slots.forEach(slot => {
            const isHovered = hoveredSlot && hoveredSlot.id === slot.id;
            const isSelected = selectedSlot && selectedSlot.id === slot.id;
            slot.draw(ctx, isHovered, isSelected);
        });
    }
}

// ユーティリティ: パス補間で特定の進捗度(0.0〜1.0)に対応する座標を返す
export function getPointOnPath(path, progress) {
    if (!path || path.length < 2) return null;

    const segmentCount = path.length - 1;
    const scaledProgress = progress * segmentCount;
    const segmentIndex = Math.floor(scaledProgress);
    const segmentProgress = scaledProgress - segmentIndex;

    if (segmentIndex >= segmentCount) {
        return { x: path[path.length - 1].x, y: path[path.length - 1].y };
    }

    const p1 = path[segmentIndex];
    const p2 = path[segmentIndex + 1];

    return {
        x: p1.x + (p2.x - p1.x) * segmentProgress,
        y: p1.y + (p2.y - p1.y) * segmentProgress
    };
}

// 色取得ヘルパー
function varColor(name) {
    switch(name) {
        case "neon-blue": return "#00f0ff";
        case "neon-green": return "#39ff14";
        case "neon-red": return "#ff0055";
        case "neon-gold": return "#ffcc00";
        default: return "#ffffff";
    }
}

// プログレスバー描画
export function drawProgressBar(ctx, x, y, w, h, ratio, color) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.shadowBlur = 4;
    ctx.shadowColor = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
    ctx.restore();
}
