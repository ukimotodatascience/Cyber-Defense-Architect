/* Cyber Defense Architect - Attackers, Defenders & Combat Logic */

import { getPointOnPath, drawProgressBar } from './map.js';

// 攻撃ユニット (敵)
export class Attacker {
    constructor(type, pathKey, map) {
        this.type = type;
        this.pathKey = pathKey;
        this.map = map;
        this.path = map.paths[pathKey];

        this.x = this.path[0].x;
        this.y = this.path[0].y;
        this.progress = 0; // path上の進捗 0.0 to 1.0

        this.size = 12;
        this.status = "active"; // active, dead, success
        this.lastVisitedServerNode = null; // ランサム感染用の直近サーバー記録

        // 特徴に応じたステータスの初期設定
        this.initStats();
    }

    initStats() {
        switch (this.type) {
            case "phishing":
                this.name = "フィッシング";
                this.maxHp = 60;
                this.hp = 60;
                this.speed = 0.08; // 素早い
                this.reward = 80;
                this.damageToTrust = 10;
                this.color = "#bd00ff"; // neon-purple
                this.icon = "✉️";
                // Firewallを無視するための属性
                this.bypassFirewall = true;
                // DMZをスキップしてパスの途中（DMZ nodeの後）から開始することがある
                // 30%の確率でDMZをワープで飛ばす
                if (Math.random() < 0.4) {
                    this.progress = 0.25; // DMZ通過直後から開始
                }
                break;

            case "bruteforce":
                this.name = "ブルートフォース";
                this.maxHp = 180;
                this.hp = 180;
                this.speed = 0.04; // やや遅い
                this.reward = 100;
                this.damageToTrust = 15;
                this.color = "#ffcc00"; // neon-gold
                this.icon = "🔑";
                this.bypassFirewall = false;
                break;

            case "sqlinjection":
                this.name = "SQLインジェクション";
                this.maxHp = 120;
                this.hp = 120;
                this.speed = 0.05;
                this.reward = 120;
                this.damageToTrust = 20;
                this.color = "#39ff14"; // neon-green
                this.icon = "💻";
                this.bypassFirewall = false;
                this.teleportedToDB = false; // DBサーバへのテレポートフラグ
                break;

            case "ransomware":
                this.name = "ランサムウェア";
                this.maxHp = 250;
                this.hp = 250;
                this.speed = 0.035; // 遅い
                this.reward = 180;
                this.damageToTrust = 25;
                this.color = "#ff0055"; // neon-red
                this.icon = "💀";
                this.bypassFirewall = false;
                break;

            case "apt":
                this.name = "APT (持続的標的型)";
                this.maxHp = 800; // ボスクラス
                this.hp = 800;
                this.speed = 0.025; // 非常に遅い
                this.reward = 500;
                this.damageToTrust = 40;
                this.color = "#00ffd5"; // neon-cyan
                this.icon = "🕵️";
                this.bypassFirewall = false;
                // ステルス状態（ゲーム開始後一定時間はロックオンされない）
                this.stealthTimer = 6000; // 6秒間のステルス
                break;

            case "insider":
                this.name = "内部不正";
                this.maxHp = 200;
                this.hp = 200;
                this.speed = 0.045;
                this.reward = 150;
                this.damageToTrust = 20;
                this.color = "#ff0055"; // neon-red
                this.icon = "👤";
                this.bypassFirewall = true;
                this.bypassWAF = true;
                this.progress = 0.25; // 内部のDMZ直後から出現
                break;
        }

        // サイバーキルチェーンのフェーズ (侵入 -> 実行 -> 権限取得 -> 横展開 -> 目的達成)
        this.killChainPhase = "intrusion";
    }

    update(delta, game) {
        if (this.status !== "active") return;

        // APTステルスタイマーの更新
        if (this.type === "apt" && this.stealthTimer > 0) {
            this.stealthTimer -= delta * game.speed;
        }

        // 基本移動速度の計算
        let currentSpeed = this.speed;

        // ブルートフォース：MFA未導入ノードが最寄りの場合、強化される
        if (this.type === "bruteforce") {
            const nearestNode = this.getNearestNode();
            if (nearestNode) {
                // 最寄りノード周辺にMFAタワーがあるか確認
                const hasMFA = game.defenders.some(t => t.type === "mfa" && t.parentNodeId === nearestNode.id);
                if (!hasMFA) {
                    currentSpeed *= 1.6; // MFAが無いとスピードアップ
                }
            }
        }

        // 進捗の更新
        this.progress += (currentSpeed * (delta / 1000)) * game.speed;

        // SQLインジェクション：Webサーバに到達したらDBサーバへ直接テレポート
        if (this.type === "sqlinjection" && !this.teleportedToDB) {
            const currentNode = this.getCurrentNode();
            if (currentNode === "web") {
                // DBサーバへ強制ワープ
                const dbIndex = this.path.findIndex(pt => pt.node === "db");
                if (dbIndex !== -1) {
                    const segmentCount = this.path.length - 1;
                    this.progress = dbIndex / segmentCount;
                    this.teleportedToDB = true;
                    game.effects.push(new FloatingText("SQLi DB BYPASS!", this.x, this.y, "#39ff14"));
                }
            }
        }

        // ゴール（目的達成）判定
        if (this.progress >= 1.0) {
            this.progress = 1.0;
            this.status = "success";
            this.triggerImpact(game);
            return;
        }

        // 座標の更新
        const pos = getPointOnPath(this.path, this.progress);
        if (pos) {
            this.x = pos.x;
            this.y = pos.y;
        }

        // 直近のサーバーノードを追従記録 (ランサム感染用)
        const currentNodeId = this.getCurrentNode();
        if (currentNodeId && currentNodeId !== "internet" && currentNodeId !== "data") {
            this.lastVisitedServerNode = currentNodeId;
        }

        // キルチェーンフェーズの更新
        if (this.progress < 0.2) this.killChainPhase = "intrusion"; // 侵入
        else if (this.progress < 0.4) this.killChainPhase = "exploitation"; // 実行
        else if (this.progress < 0.6) this.killChainPhase = "privilege"; // 権限取得
        else if (this.progress < 0.8) this.killChainPhase = "lateral"; // 横展開
        else this.killChainPhase = "impact"; // 目的達成
    }

    takeDamage(amount, type, game) {
        // 技術ツリー「FIDO2」解放時、ブルートフォース攻撃はMFA攻撃（認証攻撃）を受けると瞬時に消滅
        if (this.type === "bruteforce" && type === "mfa" && game.unlockedTech.has("fido2")) {
            this.hp = 0;
            game.effects.push(new FloatingText("FIDO2 BLOCKED!", this.x, this.y, "#00f0ff"));
        } else {
            this.hp -= amount;
        }

        if (this.hp <= 0 && this.status === "active") {
            this.status = "dead";
            game.budget += this.reward;
            game.score += this.reward * 2;
            game.effects.push(new FloatingText(`+$${this.reward}`, this.x, this.y - 10, "#ffcc00"));
        }
    }

    triggerImpact(game) {
        // 信頼度の減少
        game.trust = Math.max(0, game.trust - this.damageToTrust);
        game.effects.push(new FloatingText(`信頼度 -${this.damageToTrust}%`, this.x, this.y - 15, "#ff0055"));

        // ランサムウェア：最後に通過したサーバノードを感染（暗号化）させる
        if (this.type === "ransomware" && this.lastVisitedServerNode) {
            const targetNode = game.map.getNodeById(this.lastVisitedServerNode);
            if (targetNode) {
                targetNode.status = "infected";
                targetNode.recoveryProgress = 0;
                game.effects.push(new FloatingText("SERVER ENCRYPTED!", targetNode.x, targetNode.y, "#ff0055"));
                game.ui.log(`[警告] ${targetNode.name} がランサムウェアに感染し暗号化されました！`, "alert");
            }
        } else {
            game.ui.log(`[侵入] ${this.name} 攻撃が機密情報へ到達。信頼度が ${this.damageToTrust}% 低下しました。`, "alert");
        }
    }

    // 最寄りのノードオブジェクトを取得する
    getNearestNode() {
        let nearest = null;
        let minDist = 9999;
        this.map.nodes.forEach(node => {
            const dist = Math.hypot(node.x - this.x, node.y - this.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = node;
            }
        });
        return nearest;
    }

    // 現在地が属しているノードタイプ（文字列）を取得する
    getCurrentNode() {
        const segmentCount = this.path.length - 1;
        const segmentIndex = Math.floor(this.progress * segmentCount);
        if (segmentIndex >= 0 && segmentIndex < this.path.length) {
            return this.path[segmentIndex].node;
        }
        return null;
    }

    draw(ctx) {
        if (this.status !== "active") return;

        ctx.save();

        // ステルス状態の描画（半透明）
        if (this.type === "apt" && this.stealthTimer > 0) {
            ctx.globalAlpha = 0.25;
        }

        // グロー効果
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;

        // 敵ユニットのベース円
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // テキストアイコン
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#000";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.icon, this.x, this.y);

        // HPバーの描画
        if (this.hp < this.maxHp) {
            drawProgressBar(ctx, this.x - 15, this.y - this.size - 6, 30, 3, this.hp / this.maxHp, varColor(this.color));
        }

        // ステルス中のインジケータ
        if (this.type === "apt" && this.stealthTimer > 0) {
            ctx.strokeStyle = "#00ffd5";
            ctx.setLineDash([2, 2]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// 防御ユニット (タワー)
export class Defender {
    constructor(type, x, y, parentNodeId, game) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.parentNodeId = parentNodeId; // 保護対象のノードID
        this.level = 1;
        this.lastShotTime = 0;
        this.laserTargets = []; // 描画用レーザーの宛先

        this.initStats(game);
    }

    initStats(game) {
        // 技術ツリー解放状況による補正値の計算
        const hasNextGenWAF = game.unlockedTech.has("waf");
        const hasZeroTrust = game.unlockedTech.has("zerotrust");
        const hasMFA2 = game.unlockedTech.has("mfa");
        const hasEDR2 = game.unlockedTech.has("edr");
        const hasXDR = game.unlockedTech.has("xdr");

        switch (this.type) {
            case "firewall":
                this.name = "ファイアウォール";
                this.icon = "🛡️";
                this.cost = 700;
                this.baseRange = 140;
                this.baseDamage = 30; // 1発あたりのダメージ
                this.fireRate = 1000; // 連射速度（ミリ秒）
                this.color = "#ff0055"; // neon-red
                break;

            case "waf":
                this.name = "WAF";
                this.icon = "🌐";
                this.cost = 1000;
                this.baseRange = 130;
                this.baseDamage = 45;
                this.fireRate = 1200;
                this.color = "#00f0ff"; // neon-blue
                // WAF強化の適用
                if (hasNextGenWAF) {
                    this.baseDamage *= 1.5;
                    this.baseRange *= 1.2;
                }
                break;

            case "mfa":
                this.name = "MFA";
                this.icon = "🔑";
                this.cost = 800;
                this.baseRange = 120;
                this.baseDamage = 20;
                this.fireRate = 800; // 攻撃間隔が短い
                this.color = "#ffcc00"; // neon-gold
                break;

            case "edr":
                this.name = "EDR";
                this.icon = "🛡️";
                this.cost = 900;
                this.baseRange = 110;
                this.baseDamage = 55;
                this.fireRate = 1500;
                this.color = "#39ff14"; // neon-green
                if (hasEDR2) {
                    this.baseDamage *= 1.4;
                }
                break;

            case "backup":
                this.name = "バックアップ";
                this.icon = "💾";
                this.cost = 600;
                this.baseRange = 150;
                this.baseDamage = 0; // 攻撃能力なし
                this.fireRate = 1000;
                this.color = "#00ffd5"; // neon-cyan
                break;

            case "mailfilter":
                this.name = "メールフィルター";
                this.icon = "✉️";
                this.cost = 800;
                this.baseRange = 140;
                this.baseDamage = 45;
                this.fireRate = 1000;
                this.color = "#bd00ff"; // neon-purple
                break;

            case "education":
                this.name = "セキュリティ教育";
                this.icon = "👥";
                this.cost = 600;
                this.baseRange = 185;
                this.baseDamage = 0; // 攻撃力なし（デバフのみ）
                this.fireRate = 800;
                this.color = "#00ffd5"; // neon-cyan
                break;

            case "siem":
                this.name = "SIEM";
                this.icon = "🖥️";
                this.cost = 1200;
                this.baseRange = 160;
                this.baseDamage = 20; // 範囲内全員への持続ダメージ
                this.fireRate = 1000;
                this.color = "#39ff14"; // neon-green
                break;
        }

        // XDRによる全射程の強化
        if (hasXDR) {
            this.baseRange *= 1.15;
        }

        this.range = this.baseRange * (1 + (this.level - 1) * 0.15);
        this.damage = this.baseDamage * (1 + (this.level - 1) * 0.25);
    }

    upgrade(game) {
        if (this.level >= 3) return false;

        const upgradeCost = Math.round(this.cost * 0.6);
        if (game.budget < upgradeCost) return false;

        game.budget -= upgradeCost;
        this.level++;
        this.range = this.baseRange * (1 + (this.level - 1) * 0.15);
        this.damage = this.baseDamage * (1 + (this.level - 1) * 0.25);

        game.effects.push(new FloatingText("UPGRADE!!", this.x, this.y - 15, "#ffcc00"));
        return true;
    }

    getUpgradeCost() {
        return Math.round(this.cost * 0.6);
    }

    update(delta, game) {
        this.laserTargets = [];

        // 親ノードが感染またはオフラインの時、タワーは動作停止
        // ただし Backup タワーは自ノードの感染時も動作させる（自身を復旧するため）
        const parentNode = game.map.getNodeById(this.parentNodeId);
        if (parentNode && (parentNode.status === "infected" || parentNode.status === "offline")) {
            if (this.type !== "backup") return;
        }

        const now = Date.now();

        // 1. バックアップタワーの動作（感染したサーバーを復旧）
        if (this.type === "backup") {
            // 射程内の感染ノードを探す
            let targetNode = null;
            let minDist = this.range;
            game.map.nodes.forEach(node => {
                if (node.status === "infected") {
                    const dist = Math.hypot(node.x - this.x, node.y - this.y);
                    if (dist < minDist) {
                        minDist = dist;
                        targetNode = node;
                    }
                }
            });

            if (targetNode) {
                // 復旧ビームを照射
                this.laserTargets.push({ x: targetNode.x, y: targetNode.y, color: "#00ffd5" });

                // 復旧速度の計算 (Cloud Backup解放時は倍速)
                const recoveryRate = game.unlockedTech.has("zerotrust") ? 15 : 8; // 技術解放で復旧力アップ
                targetNode.recoveryProgress += recoveryRate * (delta / 1000) * game.speed * this.level;

                if (targetNode.recoveryProgress >= 100) {
                    targetNode.status = "nominal";
                    targetNode.recoveryProgress = 0;
                    // スタッフが実際に割り当てられていた場合のみ解除・デクリメント
                    if (targetNode.isStaffAssigned) {
                        targetNode.isStaffAssigned = false;
                        game.staffUsed = Math.max(0, game.staffUsed - 1);
                    }
                    game.ui.log(`[復旧] バックアップにより ${targetNode.name} が安全に復旧しました。`, "success");
                    game.effects.push(new FloatingText("RESTORED!", targetNode.x, targetNode.y, "#39ff14"));
                }
            }
            return;
        }

        // 1.5 セキュリティ教育タワーの動作（敵を減速）
        if (this.type === "education") {
            if (now - this.lastShotTime >= this.fireRate / game.speed) {
                const targets = this.findTargets(game);
                targets.forEach(target => {
                    if (!target.isSlowedByEducation) {
                        target.isSlowedByEducation = true;
                        target.speed = target.speed * 0.65;
                        game.effects.push(new FloatingText("EDU SLOW", target.x, target.y - 12, this.color));
                    }
                    this.laserTargets.push({ x: target.x, y: target.y, color: this.color });
                });
                this.lastShotTime = now;
            }
            return;
        }

        // 2. 一般防衛タワーの動作（敵を迎撃）
        if (now - this.lastShotTime >= this.fireRate / game.speed) {
            // 射程内の敵を検索
            const targets = this.findTargets(game);
            if (targets.length > 0) {
                targets.forEach(target => {
                    // ダメージ・効果の適用
                    let actualDamage = this.damage;

                    // 防御特攻・デバフの適用
                    actualDamage = this.applyCombatModifier(target, actualDamage, game);

                    // 多層防御 (Defense in Depth) ボーナスの計算
                    // 対象の敵を現在狙っている他の異なる防衛タワーの数をカウント
                    const depthCount = this.calculateDefenseDepth(target, game);
                    if (depthCount >= 2) {
                        // 2種類以上のタワーが狙っている場合、ボーナス発動
                        // XDRがアンロックされているとボーナス効果1.5倍
                        const multiplier = game.unlockedTech.has("xdr") ? 1.5 : 1.0;
                        const depthBonus = 1 + (depthCount - 1) * 0.5 * multiplier;
                        actualDamage *= depthBonus;

                        // 多層防御のエフェクト
                        if (Math.random() < 0.15) {
                            game.effects.push(new FloatingText(`DEPTH x${depthCount}`, target.x + (Math.random() * 20 - 10), target.y - 15, "#bd00ff"));
                        }
                    }

                    target.takeDamage(actualDamage, this.type, game);
                    this.laserTargets.push({ x: target.x, y: target.y, color: this.color, thickness: depthCount >= 2 ? 3 : 1 });
                });

                this.lastShotTime = now;
            }
        }
    }

    findTargets(game) {
        // 射程内の敵を全検索
        let candidates = game.attackers.filter(enemy => {
            if (enemy.status !== "active") return false;

            // APTステルス中はターゲットにできない
            if (enemy.type === "apt" && enemy.stealthTimer > 0) return false;

            // Firewallはフィッシングに無効なため、最初から候補に含めない
            // （クールダウンを無駄に消費してしまうのを防ぐ）
            if (this.type === "firewall" && enemy.type === "phishing") return false;

            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            return dist <= this.range;
        });

        if (candidates.length === 0) return [];

        // 基本は「最も進んでいる敵」をターゲットにする
        candidates.sort((a, b) => b.progress - a.progress);

        // SIEMは射程内の敵全員を同時攻撃可能
        if (this.type === "siem") {
            return candidates;
        }

        // レベルに応じて同時射撃数が増加（Firewallは複数ターゲット可能）
        const maxTargets = this.type === "firewall" ? this.level : 1;
        return candidates.slice(0, maxTargets);
    }

    applyCombatModifier(target, baseDmg, game) {
        let dmg = baseDmg;

        // WAF: SQLインジェクション、XSS等に3倍
        if (this.type === "waf") {
            if (target.type === "sqlinjection") {
                dmg *= 3.0;
                game.effects.push(new FloatingText("WAF INTERCEPT", target.x, target.y - 12, "#39ff14"));
            } else if (target.type === "phishing") {
                dmg *= 0.5; // フィッシングには効きにくい
            }
        }

        // MFA: ブルートフォースに大ダメージ＆大幅減速
        if (this.type === "mfa") {
            if (target.type === "bruteforce") {
                dmg *= 2.5;
                // 減速効果（Multi-Factor Auth研究解放で効果大）
                const slowFactor = game.unlockedTech.has("mfa") ? 0.3 : 0.5; // 速度を30%/50%に低下
                target.speed = target.speed * slowFactor;
                game.effects.push(new FloatingText("MFA DEBUFF", target.x, target.y - 12, "#ffcc00"));
            }
        }

        // EDR: ランサムウェア等のマルウェアに3倍
        if (this.type === "edr") {
            if (target.type === "ransomware") {
                dmg *= 3.0;
                game.effects.push(new FloatingText("EDR SCAN & BLOCK", target.x, target.y - 12, "#ff0055"));
            }
        }

        // Firewall: フィッシングには完全無効（ダメージ0）
        if (this.type === "firewall") {
            if (target.type === "phishing") {
                dmg = 0;
            }
        }

        // メールフィルター: フィッシングに特効4倍、その他には0.2倍
        if (this.type === "mailfilter") {
            if (target.type === "phishing") {
                dmg *= 4.0;
                game.effects.push(new FloatingText("MAIL FILTERED", target.x, target.y - 12, this.color));
            } else {
                dmg *= 0.2;
            }
        }

        // SIEM: ログ統合分析によるバフ適用（SIEMの射程内にある他のタワーの攻撃力をアップ）
        const hasSIEMBuff = game.defenders.some(def => {
            if (def.type !== "siem") return false;
            const parent = game.map.getNodeById(def.parentNodeId);
            if (parent && (parent.status === "infected" || parent.status === "offline")) return false;
            const dist = Math.hypot(def.x - target.x, def.y - target.y);
            return dist <= def.range;
        });
        if (hasSIEMBuff && this.type !== "siem") {
            dmg *= 1.35; // 他のタワーの攻撃力を35%バフ
        }

        // 技術ツリー「Zero Trust Core」解放：全ノードでフィッシングなどのバイパスダメージを底上げ
        if (game.unlockedTech.has("zerotrust") && target.type === "phishing" && this.type !== "firewall" && this.type !== "mailfilter") {
            dmg *= 1.3;
        }

        return dmg;
    }

    calculateDefenseDepth(target, game) {
        // 同一ターゲットを同時に攻撃範囲に収めている「ユニークなタワータイプ」の数をカウント
        const targetingTowerTypes = new Set();
        targetingTowerTypes.add(this.type);

        game.defenders.forEach(def => {
            if (def === this || def.type === "backup") return;

            // 親ノードが停止している場合は無視
            const parent = game.map.getNodeById(def.parentNodeId);
            if (parent && (parent.status === "infected" || parent.status === "offline")) return;

            const dist = Math.hypot(def.x - target.x, def.y - target.y);
            if (dist <= def.range) {
                // Firewallはフィッシングに実質ダメージ 0 なので深度ボーナスにカウントしない
                if (def.type === "firewall" && target.type === "phishing") return;
                targetingTowerTypes.add(def.type);
            }
        });

        return targetingTowerTypes.size;
    }

    draw(ctx) {
        ctx.save();

        const w = 62;
        const h = 40;
        const x = this.x - w / 2;
        const y = this.y - h / 2;
        const r = 4;

        // ドロップシャドウ/グロー
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;

        // 半透明の黒い背景
        ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;

        // 角丸四角形描画
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

        ctx.shadowBlur = 0; // テキストはグローなしでクッキリ

        // アイコンの描画（左側）
        ctx.fillStyle = "#fff";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(this.icon, x + 6, y + h / 2);

        // タワー名とレベルの描画（右側）
        ctx.font = "bold 9px 'Share Tech Mono', sans-serif";
        ctx.fillText(this.name, x + 23, y + 13);

        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        ctx.font = "9px 'Share Tech Mono', sans-serif";
        ctx.fillText(`Lv.${this.level}`, x + 23, y + 27);

        // 下部のレベルインジケータ（緑ドット）
        const dotY = y + h + 6;
        const maxDots = 5;
        const dotSize = 2.5;
        const dotSpacing = 7;
        const startDotX = this.x - ((maxDots - 1) * dotSpacing) / 2;

        for (let i = 0; i < maxDots; i++) {
            ctx.beginPath();
            ctx.arc(startDotX + i * dotSpacing, dotY, dotSize, 0, Math.PI * 2);
            if (i < this.level) {
                ctx.fillStyle = "#39ff14"; // 点灯
                ctx.shadowBlur = 3;
                ctx.shadowColor = "#39ff14";
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.15)"; // 消灯
                ctx.shadowBlur = 0;
            }
            ctx.fill();
        }

        ctx.restore();
    }

    drawLaser(ctx) {
        if (this.laserTargets.length === 0) return;

        ctx.save();
        this.laserTargets.forEach(target => {
            ctx.strokeStyle = target.color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = target.color;
            ctx.lineWidth = target.thickness || 1.5;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();

            // レーザー接触点のエフェクト
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

// 浮遊するダメージテキストなど
export class FloatingText {
    constructor(text, x, y, color = "#fff") {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.opacity = 1.0;
        this.life = 1000; // 寿命（ミリ秒）
        this.spawnTime = Date.now();
    }

    update(delta, game) {
        const elapsed = Date.now() - this.spawnTime;
        this.opacity = 1.0 - elapsed / this.life;
        this.y -= (20 * (delta / 1000)) * game.speed; // ゆっくり上昇

        return elapsed < this.life; // 生存しているか
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.font = "bold 14px 'Share Tech Mono'";
        ctx.textAlign = "center";
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// ヘルパー
function varColor(hexColor) {
    return hexColor;
}
