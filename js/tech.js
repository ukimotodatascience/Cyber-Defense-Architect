/* Cyber Defense Architect - Technology Tree Definitions & Logic */

export const TECH_ITEMS = {
    // 境界・Web防御系
    firewall: {
        id: "firewall",
        name: "Firewall (初期)",
        desc: "基本的な境界防御。ポートスキャン等を検知。",
        costBudget: 0,
        costStaff: 0,
        req: null
    },
    waf: {
        id: "waf",
        name: "Next-Gen WAF",
        desc: "Webサーバ保護。SQLiやXSSへの攻撃力+50%、射程+20%",
        costBudget: 400,
        costStaff: 1,
        req: "firewall"
    },
    zerotrust: {
        id: "zerotrust",
        name: "Zero Trust Core",
        desc: "境界防御の概念を排し、全ノードでフィッシング等のバイパス攻撃を30%減衰。",
        costBudget: 600,
        costStaff: 2,
        req: "waf"
    },

    // 認証・ID管理系
    password: {
        id: "password",
        name: "Password (初期)",
        desc: "標準的なパスワード認証。ブルートフォースの標的になりやすい。",
        costBudget: 0,
        costStaff: 0,
        req: null
    },
    mfa: {
        id: "mfa",
        name: "Multi-Factor Auth",
        desc: "多要素認証。ブルートフォース攻撃の進行速度を半減（鈍化効果強化）。",
        costBudget: 300,
        costStaff: 1,
        req: "password"
    },
    fido2: {
        id: "fido2",
        name: "FIDO2 / Passwordless",
        desc: "パスワードレス認証。ブルートフォース攻撃を完全に無効化（瞬時撃破）。",
        costBudget: 500,
        costStaff: 2,
        req: "mfa"
    },

    // 検知・端末防御系
    antivirus: {
        id: "antivirus",
        name: "Anti-Virus (初期)",
        desc: "パターンマッチングによるマルウェア防御。新型には無力。",
        costBudget: 0,
        costStaff: 0,
        req: null
    },
    edr: {
        id: "edr",
        name: "EDR (Endpoint Detection)",
        desc: "挙動検知。ランサムウェア等のマルウェアへの毎秒ダメージ+40%。",
        costBudget: 500,
        costStaff: 1,
        req: "antivirus"
    },
    xdr: {
        id: "xdr",
        name: "XDR & SIEM Integration",
        desc: "ログの統合分析。すべてのタワーの射程+15%、多層防御ボーナス効果が1.5倍。",
        costBudget: 800,
        costStaff: 2,
        req: "edr"
    }
};

export class TechTree {
    constructor(game) {
        this.game = game;
    }

    // 技術をアンロックできるか判定
    canUnlock(techId) {
        const item = TECH_ITEMS[techId];
        if (!item) return false;

        // すでにアンロック済
        if (this.game.unlockedTech.has(techId)) return false;

        // 前提技術がアンロックされているか
        if (item.req && !this.game.unlockedTech.has(item.req)) return false;

        // コストチェック
        if (this.game.budget < item.costBudget) return false;
        if (this.game.staffAvailable < item.costStaff) return false;

        return true;
    }

    // 技術をアンロックする
    unlock(techId) {
        if (!this.canUnlock(techId)) return false;

        const item = TECH_ITEMS[techId];

        // リソース消費
        this.game.budget -= item.costBudget;
        this.game.staffUsed += item.costStaff; // 研究にアサインされ、使用中になる

        // アンロック
        this.game.unlockedTech.add(techId);
        this.game.score += 300; // 研究スコア加算

        // 既存タワーのステータス再計算
        this.game.defenders.forEach(tower => {
            tower.initStats(this.game);
        });

        this.game.ui.log(`[研究完了] 「${item.name}」が開発されました。効果が即座に適用されます。`, "success");
        return true;
    }
}
