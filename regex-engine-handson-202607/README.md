# Nextbeat Build Night Osaka #1 — Claude Codeで作る、ReDoSしない正規表現エンジン

「微分」たった1個の設計で、**ReDoS しない実用正規表現エンジン**を TypeScript で立ち上げる90分ハンズオン教材（定員6名）。

毎日使う正規表現の中身を、おもちゃでなく**ライブラリ品質**（線形時間・ReDoS 耐性）で自作する。
ゴールは正規表現理論の講義ではなく、**「基本設計さえ握れば、AI（Claude Code）で“使えるもの”がぱっと立ち上がってしまう」という開発体験**を持ち帰ること。

## これは何が嬉しいのか

- バックトラッキング型の標準 `RegExp` は `/^(a+)+$/` に28文字で **約8.8秒フリーズ**（ReDoS）
- 本エンジン（Brzozowski 微分による遅延DFA）は同じ入力を **0.2ms**、**1000万文字でも約0.2秒**、状態数は入力長によらず一定＝**O(n)**
- 核は `nullable` と `derivative` の **2関数（約30行）** だけ。設計表（[SPEC.md](./SPEC.md)）とコードが1対1

## セットアップ（前日までに必須）

```bash
git clone <this-repo>
cd regex-engine-handson
pnpm install
git switch start   # 参加者の出発点（穴埋め版・テストが赤い）
pnpm test          # 赤いテストが出れば準備OK。当日この赤を緑にする
```

- Node 20+ / pnpm 9+
- Claude Code が動く状態（ログイン確認）。動かない人は当日ペア相乗りでOK
- 「自分が普段書く一番複雑な正規表現」を1つ持参（当日 自作エンジンに食わせる）
- 予習不要・むしろ禁止トーン：「Brzozowski 微分」を事前にググって分かった気にならなくていい

## ブランチ構成

| ブランチ | 中身 |
|---|---|
| `start` | **参加者の出発点**。`derivative.ts` と `normalize.ts` が TODO（テスト赤） |
| `main` | **完成版（答え）**。講師リファレンス。詰まったら参照 |

## コマンド

```bash
pnpm test                 # vitest（start では赤、実装が進むと緑）
pnpm bench:redos 28       # 標準RegExp vs 自作エンジンのReDoS対比（掴み）
pnpm bench:linear         # 自作エンジンの線形時間を実測（オチ）
pnpm cli "[a-z]+@[a-z]+" "foo@bar"          # 全体一致
pnpm cli --search "ab" "xxabxx"              # 部分一致
```

## 90分の流れ

1. **掴み（19:00-）** `pnpm bench:redos` で標準 `RegExp` を目の前でフリーズさせる
2. **設計を握る（19:20-）** 正規表現を「状態」とみなす＝微分。`nullable`/`derivative` を紙で合意（[SPEC.md](./SPEC.md)）
3. **山場（19:42-）** 設計表を Claude Code に投入 → コアが数分で生成 → 赤いテストが一斉に緑（[AGENT_PROMPTS.md](./AGENT_PROMPTS.md) ①）
4. **道具に丸投げ（19:55-）** パーサ・CLI を AI に書かせる（③）
5. **実用品質の確認（20:05-）** 状態爆発を正規化で直し（②）、`pnpm bench:linear` で O(n) を実証
6. **設計の境界（20:13-）** 後方参照 `\1` を**あえて入れない**理由＝線形保証（[SPEC.md](./SPEC.md) 末尾）

## コード地図

| ファイル | 役割 | 当日 |
|---|---|---|
| `src/ast.ts` | AST 型・`canonicalKey`・1文字ヘルパ | 完成品（読む） |
| `src/derivative.ts` | **`nullable` / `derivative`（コア30行）** | **start で穴埋め（山場①）** |
| `src/normalize.ts` | スマートコンストラクタ（ACI 正規化） | **start で穴埋め（②）** |
| `src/match.ts` | `fullMatch` / 遅延DFA `LazyDfa` / `toSearch` | 完成品 |
| `src/parser.ts` | 正規表現文字列 → AST | AI に丸投げ（③） |
| `src/index.ts` | 公開API `compile` | 完成品 |
| `tests/spec.test.ts` | 仕様テスト（`a?b` トラップ含む） | これを緑にするのがゴール |
| `SPEC.md` | 基本設計＝規則表（プロンプトの素） | 山場で握る |
| `AGENT_PROMPTS.md` | Claude Code 投入用の固定プロンプト | 各段で使う |

---
教材作成: 2026-06（大阪ハンズオン用）。設計手法は Brzozowski derivatives（1964）。
