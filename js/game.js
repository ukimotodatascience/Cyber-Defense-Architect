/* Cyber Defense Architect - Game State Management & Stage Definitions */

export const STAGES = {
    1: {
        id: 1,
        name: "初級: 基本防御演習",
        description: "SQLインジェクションとブルートフォース攻撃に対する基礎的な多層防御（WAF, MFA）を検証する。",
        initialBudget: 1500,
        initialStaff: 3,
        waves: [
            {
                // Wave 1
                spawnList: [
                    { type: "bruteforce", count: 4, interval: 3000 }
                ]
            },
            {
                // Wave 2
                spawnList: [
                    { type: "sqlinjection", count: 3, interval: 4000 }
                ]
            },
            {
                // Wave 3
                spawnList: [
                    { type: "bruteforce", count: 5, interval: 2500 },
                    { type: "sqlinjection", count: 3, interval: 3500 }
                ]
            }
        ]
    },
    2: {
        id: 2,
        name: "中級: ランサムウェアの脅威",
        description: "フィッシングメールとランサムウェアが登場。EDRとバックアップを適切に配置して暗号化被害を防ぐ。",
        initialBudget: 2000,
        initialStaff: 3,
        waves: [
            {
                spawnList: [
                    { type: "phishing", count: 5, interval: 2000 }
                ]
            },
            {
                spawnList: [
                    { type: "ransomware", count: 2, interval: 6000 }
                ]
            },
            {
                spawnList: [
                    { type: "phishing", count: 6, interval: 1500 },
                    { type: "ransomware", count: 3, interval: 5000 }
                ]
            }
        ]
    },
    3: {
        id: 3,
        name: "ステージ 3-2: ランサムウェアの脅威",
        description: "フィッシングメール、ブルートフォース、ランサムウェア、内部不正が同時に襲来。多層防御で要所を守り抜け。",
        initialBudget: 2450,
        initialStaff: 5,
        waves: [
            {
                // Wave 1
                spawnList: [
                    { type: "phishing", count: 6, interval: 2000 },
                    { type: "bruteforce", count: 4, interval: 2000 }
                ]
            },
            {
                // Wave 2 (Matches reference image: phishing x12, bruteforce x8, ransomware x5, insider x3)
                spawnList: [
                    { type: "phishing", count: 12, interval: 1500 },
                    { type: "bruteforce", count: 8, interval: 2000 },
                    { type: "ransomware", count: 5, interval: 3000 },
                    { type: "insider", count: 3, interval: 4000 }
                ]
            },
            {
                // Wave 3
                spawnList: [
                    { type: "sqlinjection", count: 6, interval: 2500 },
                    { type: "ransomware", count: 4, interval: 3000 }
                ]
            },
            {
                // Wave 4
                spawnList: [
                    { type: "apt", count: 1, interval: 1000 },
                    { type: "insider", count: 5, interval: 2000 },
                    { type: "ransomware", count: 4, interval: 3000 }
                ]
            },
            {
                // Wave 5
                spawnList: [
                    { type: "apt", count: 2, interval: 4000 },
                    { type: "phishing", count: 10, interval: 1500 },
                    { type: "ransomware", count: 5, interval: 2500 },
                    { type: "insider", count: 4, interval: 3000 }
                ]
            }
        ]
    },
    4: {
        id: 4,
        name: "超級: サプライチェーン攻撃",
        description: "境界防御（Firewall）を迂回し、内部のWebサーバや認証サーバから突然出現する複合攻撃ウェーブ。",
        initialBudget: 3000,
        initialStaff: 4,
        waves: [
            {
                spawnList: [
                    { type: "phishing", count: 8, interval: 1200 } // Firewall無視して直接内部へ
                ]
            },
            {
                spawnList: [
                    { type: "bruteforce", count: 8, interval: 1800 },
                    { type: "sqlinjection", count: 6, interval: 2000 }
                ]
            },
            {
                spawnList: [
                    { type: "ransomware", count: 5, interval: 4000 },
                    { type: "apt", count: 2, interval: 8000 }
                ]
            },
            {
                spawnList: [
                    { type: "phishing", count: 6, interval: 1500 },
                    { type: "sqlinjection", count: 6, interval: 1500 },
                    { type: "ransomware", count: 4, interval: 3000 },
                    { type: "apt", count: 2, interval: 5000 }
                ]
            }
        ]
    },
    5: {
        id: 5,
        name: "最終: 国家支援型攻撃グループ",
        description: "これまでのすべての脅威が同時に、かつ圧倒的な数で襲いかかる。多層防御アーキテクトとしての真価が問われる。",
        initialBudget: 3500,
        initialStaff: 5,
        waves: [
            {
                spawnList: [
                    { type: "bruteforce", count: 10, interval: 1000 },
                    { type: "sqlinjection", count: 8, interval: 1500 }
                ]
            },
            {
                spawnList: [
                    { type: "phishing", count: 10, interval: 1000 },
                    { type: "ransomware", count: 6, interval: 2500 }
                ]
            },
            {
                spawnList: [
                    { type: "apt", count: 3, interval: 6000 },
                    { type: "sqlinjection", count: 10, interval: 1200 },
                    { type: "ransomware", count: 6, interval: 2000 }
                ]
            },
            {
                spawnList: [
                    { type: "phishing", count: 12, interval: 800 },
                    { type: "bruteforce", count: 12, interval: 800 },
                    { type: "sqlinjection", count: 10, interval: 1000 },
                    { type: "ransomware", count: 8, interval: 1500 },
                    { type: "apt", count: 4, interval: 4000 }
                ]
            }
        ]
    }
};

export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.status = "briefing"; // briefing, playing, paused, over, victory
        this.speed = 1; // 0 = paused, 1 = normal, 2 = fast

        this.stage = null;
        this.currentWaveIndex = 0; // 0-indexed

        this.trust = 100; // 企業信頼度 (%)
        this.continuity = 100; // 事業継続率 (%)
        this.budget = 0; // 防御予算
        this.staffMax = 0; // 最大人員
        this.staffUsed = 0; // 使用中人員

        // システム停止時間カウンタ (毎秒更新され、上限超過で敗北)
        this.systemDowntime = 0;
        this.maxDowntimeLimit = 60; // 60秒以上の累積停止でゲームオーバー

        // ゲームエンティティ
        this.attackers = [];
        this.defenders = [];
        this.projectiles = [];
        this.effects = []; // ビジュアルエフェクトやフローティングテキスト

        // 技術研究アンロックリスト
        this.unlockedTech = new Set(["firewall", "password", "antivirus"]);

        // スパニック(敵の生成)スケジューラ
        this.spawnQueue = [];
        this.lastSpawnTime = 0;
        this.waveInProgress = false;

        // スコア
        this.score = 0;

        // 選択対象 (Node or Tower)
        this.selectedEntity = null;
    }

    loadStage(stageId) {
        this.reset();
        const stageData = STAGES[stageId];
        if (!stageData) return false;

        this.stage = stageData;
        this.budget = stageData.initialBudget;
        this.staffMax = stageData.initialStaff;
        this.staffUsed = 0;
        this.trust = 100;
        this.continuity = 100;
        this.status = "playing";
        this.speed = 1;

        return true;
    }

    get staffAvailable() {
        return this.staffMax - this.staffUsed;
    }

    startNextWave() {
        if (this.waveInProgress) return false;
        if (this.currentWaveIndex >= this.stage.waves.length) return false;

        const waveData = this.stage.waves[this.currentWaveIndex];
        this.spawnQueue = [];

        // ウェーブの敵を生成キューに格納
        waveData.spawnList.forEach(spawnInfo => {
            for (let i = 0; i < spawnInfo.count; i++) {
                this.spawnQueue.push({
                    type: spawnInfo.type,
                    delay: spawnInfo.interval * i + (Math.random() * 500) // わずかにランダム性をもたせる
                });
            }
        });

        // キューをディレイ時間順に近いものからソートする
        // ただし出現タイミングをずらすために、単に出現タイプごとに時間差をつけてキューに格納
        // 異なるタイプ同士が並行して出現するように、マージしてシャッフル
        this.spawnQueue.sort((a, b) => a.delay - b.delay);

        // 相対ディレイ時間を絶対経過時間（spawn開始からの経過時間）に変換
        let baseTime = 0;
        this.spawnQueue = this.spawnQueue.map(item => {
            return {
                type: item.type,
                spawnTime: item.delay
            };
        });

        this.waveInProgress = true;
        this.lastSpawnTime = performance.now();
        this.waveStartTime = performance.now();
        this.waveActiveTime = 0;
        return true;
    }

    updateResources(delta) {
        // システム停止による事業継続率の減少
        // 感染しているノードがある場合、事業継続率が下がる
        let infectedCount = 0;
        if (this.map && this.map.nodes) {
            this.map.nodes.forEach(node => {
                if (node.status === "infected") {
                    infectedCount++;
                }
            });
        }

        if (infectedCount > 0) {
            // 感染ノード数に応じて事業継続率が毎秒減少 (1ノードにつき毎秒5%減少)
            const continuityDrain = 5.0 * infectedCount * this.speed * (delta / 1000);
            this.continuity = Math.max(0, this.continuity - continuityDrain);

            // システム停止時間を累積
            this.systemDowntime += (delta / 1000) * this.speed;
        } else {
            // 感染が無い場合は緩やかに事業継続率が回復 (毎秒2%回復)
            this.continuity = Math.min(100, this.continuity + 2.0 * this.speed * (delta / 1000));
        }

        // 敗北条件チェック
        if (this.trust <= 0 || this.continuity <= 0 || this.systemDowntime >= this.maxDowntimeLimit) {
            this.status = "over";
        }
    }

    checkWaveCompletion() {
        if (!this.waveInProgress) return;

        // すべての敵が撃破され、かつ生成キューが空の場合ウェーブ終了
        if (this.spawnQueue.length === 0 && this.attackers.length === 0) {
            this.waveInProgress = false;
            this.currentWaveIndex++;
            this.score += 500 * (this.currentWaveIndex); // ウェーブクリアボーナス

            // 予算報酬
            this.budget += 300 + (this.currentWaveIndex * 100);

            // 全ウェーブクリア時の勝利判定
            if (this.currentWaveIndex >= this.stage.waves.length) {
                this.status = "victory";
                // 最終スコア算出
                this.score += Math.round(this.trust * 10 + this.continuity * 10 + this.budget);
            }
        }
    }
}
