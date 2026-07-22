# Nextbeat Osaka Lab #1 — Claude Codeで作る、正規表現エンジン

「微分」たった1個の設計で、**ReDoS しない実用正規表現エンジン**を TypeScript で立ち上げるハンズオン教材。
2026-07-23（木）19:00-21:00・大阪オフィス開催・定員4名。

毎日使う正規表現の中身を、おもちゃでなく**ライブラリ品質**（線形時間・ReDoS 耐性）で自作する。
ゴールは正規表現理論の講義ではなく、**「基本設計さえ固めれば、AI（Claude Code / Codex）で“使えるもの”がぱっと立ち上がってしまう」という開発体験**を持ち帰ること。

理論パート（Brzozowski 微分）は独立して読めるスライド [`derivative.md`](./derivative.md)（[PDF](./derivative.pdf)）にまとめてある。当日の進行は [`slide.md`](./slide.md)（[PDF](./slide.pdf)）。

## これは何が嬉しいのか

- バックトラッキング型の標準 `RegExp` は `/^(a+)+$/` に長い `a` の列＋末尾1文字を食わせると一気にフリーズする（**ReDoS**）。実測: 26文字で約2秒、32文字で約1.5分（マシン依存。`pnpm bench:redos` で当日実測する）
- 本エンジン（Brzozowski 微分による遅延DFA）は同じ入力を**ミリ秒未満**、**1000万文字でも約0.2秒**、状態数は入力長によらず一定＝**O(n)**
- 核は `nullable` と `derivative` の **2関数（約30行）** だけ。設計表（[SPEC.md](./SPEC.md)）とコードが1対1

## セットアップ（前日までに必須）

```bash
git clone https://github.com/nextbeat-dev/nextbeat-tech-event.git
cd nextbeat-tech-event/regex-engine-handson-202607
git switch start   # 参加者の出発点（穴埋め版）
pnpm install
pnpm test          # 27件中22件が赤くなれば準備OK（メッセージは全て "TODO(山場①): ..."）
```

- Node 20+ / pnpm 9+（`pnpm` が無ければ `corepack enable pnpm`）
- Claude Code または Codex が動く状態（ログイン確認）。動かない人は当日ペア相乗りでOK
- 「自分が普段書く一番複雑な正規表現」を1つ持参（当日 自作エンジンに食わせる。対応構文は下記「持参する正規表現について」を参照）
- 予習不要・むしろ禁止トーン：「Brzozowski 微分」を事前にググって分かった気にならなくていい

`pnpm test` の結果について: 27件中5件（`^` `$` `{n,m}` の壊れ方などを検査する構文エラー系のテスト）は `src/parser.ts` が既に完成品のため最初から緑になる。残り22件が赤くなり、失敗メッセージが全て `TODO(山場①): ...` であれば準備完了。それ以外のエラー（`fatal: invalid reference: start` など）が出る場合は下記「トラブルシューティング」を見る。

## ブランチ構成

| ブランチ | 中身 |
|---|---|
| `start` | **参加者の出発点**。`derivative.ts`（山場①）と `normalize.ts`（②、正規化なしの素朴実装）が穴埋め |
| `main` | **完成版（答え）**。講師リファレンス。詰まったら参照 |

`git switch start` が `fatal: invalid reference: start` で失敗する場合は `git fetch origin start:start && git switch start` を試す。

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `pnpm: command not found` | `corepack enable pnpm`（Node 20+ に同梱） |
| Node バージョンが古い（`node -v` が `v20` 未満） | [nodejs.org](https://nodejs.org) や `nvm`/`volta` で 20 以上に。その場で直せない場合は当日ペア相乗り |
| `git switch start` が `fatal: invalid reference` | `git fetch origin start:start && git switch start` |
| Windows で `pnpm install`/`pnpm test` が動かない | WSL2 上で実行する（生 Windows は非対応） |
| 会場 Wi-Fi で `pnpm install` が終わらない | 講師にオフライン配布（tarball/USB）を相談 |
| 山場①でAIの生成が迷走・テストが緑にならない | `git restore --source=main -- src/derivative.ts` で完成版に置き換えて合流（`normalize.ts` はそのまま） |
| ②でAIの生成が迷走・全緑にならない | `git restore --source=main -- src/derivative.ts src/normalize.ts` で完成版に置き換えて合流 |
| Claude Code / Codex にログインできない・レート制限 | (1) 隣の人のエージェントに同じプロンプトを投げる（ペア相乗り） (2) それも無理なら SPEC.md の表を見ながら手で埋める（switch 6分岐なので数分で書ける） |

## コマンド

```bash
pnpm test                       # stage1: 意味論テスト（vitest）。start では一部赤、実装が進むと緑
pnpm test:all                   # stage1 + stage2（線形性・状態数の収束）。②が緑になって初めて全部緑
pnpm bench:redos 16             # 標準RegExp vs 自作エンジンのReDoS対比（②の前後で使い分ける。下記参照）
pnpm bench:redos 28 --force     # nを上げて標準RegExpをライブで固める（n>30は要 --force。当日は講師のみ）
pnpm bench:linear                # 自作エンジンの線形時間を実測（オチ。②完了後に）
pnpm cli '[a-z]+@[a-z]+' 'foo@bar'   # 全体一致
pnpm cli --search 'ab' 'xxabxx'       # 部分一致
```

- `pnpm cli`/`pnpm bench:redos` のパターンは必ず**シングルクォート**で囲む（`[ ] ( ) + |` をシェルが先に解釈してしまう）
- `bench:redos`/`bench:linear` は、①（derivative）が未実装なら「まだ動かない」旨を表示して終了し、②（正規化）が未実装なら12文字プローブで状態爆発を検知して安全に打ち切る（OOM/フリーズしない）

## 当日の流れ

| 時刻 | 所要 | ステップ | やること |
|---|---|---|---|
| 19:00-19:10 | 10分 | 受付・自己紹介 | |
| 19:10-19:20 | 10分 | イントロ・ReDoS実演 | 講師デモ（見るだけ） |
| **19:20-19:25** | 5分 | **0. 同期チェック** | 全員 `start` ブランチで `pnpm test` が赤22件になっているか確認 |
| **19:25-19:40** | 15分 | **1. 設計を固める** | 正規表現を「状態」とみなす＝微分。`nullable`/`derivative` の規則表を紙で合意（[SPEC.md](./SPEC.md)。`∂b(a?b)` の手トレースまで） |
| **19:40-19:55** | 15分 | **2. 山場①** | 設計表を AI（Claude Code / Codex）に投入（[AGENT_PROMPTS.md](./AGENT_PROMPTS.md) ①）→ コアが数分で生成 → `pnpm test` で赤が一斉に緑 |
| **19:55-20:03** | 8分 | **3. まず壊す** | 正規化なしのまま `pnpm bench:redos 16` → 自作エンジンでも状態が爆発して打ち切られるのを体感（**n は 16 まで。20 以上・引数省略は禁止**） |
| **20:03-20:15** | 12分 | **4. 正規化②** | ACI 正規化を投入（AGENT_PROMPTS ②）→ `pnpm test:all` 全緑 → `pnpm bench:linear` で 1000万文字・状態数一定＝O(n) を実証 |
| **20:15-20:23** | 8分 | **5. 実食** | 持参した「一番複雑な正規表現」を対応構文に簡約して `pnpm cli` に食わせる |
| **20:23-20:30** | 7分 | **6. 設計の境界** | 後方参照 `\1` を**あえて入れない**理由＝線形保証（[SPEC.md](./SPEC.md) 末尾）→ 締め |
| 20:30-20:50 | 20分 | 振り返り・懇親会 | |
| 20:50-21:00 | 10分 | 片付け・撤収 | |

太字の0〜6がハンズオン本体（70分）。進行が遅れた場合の目安時刻は [TEACHING.md](./TEACHING.md)（講師専用）を参照。

①直後（②未着手）は `pnpm test` は全緑のまま、`pnpm test:all` だけ linear.test.ts の2件が赤くなるのが正常（メッセージは状態数のアサーション。ハングしない）。②を実装すると全緑になる。

### 持ち帰り課題（当日はやらない）

- **③ パーサを AI に再生成させる**（[AGENT_PROMPTS.md](./AGENT_PROMPTS.md) ③）。`src/parser.ts` は完成品として渡してあるので、退避してから再生成する。失敗しても `git restore src/parser.ts` で戻せる
- **④ 交差 `r&s`・補集合 `¬r` の追加**（AGENT_PROMPTS ④）。`canonicalKey` と `normalize.ts` への波及に注意
- 答え（完成版）は `main` ブランチ

## 持参する正規表現について

このエンジンは「基本コアを軽量に保つ」設計思想のため、対応していない構文は**黙って誤動作させず、対処法つきのエラー**にしてある。

**対応**: 連接 / 選択 `|` / 量化子 `* + ? {n} {n,} {n,m}` / グループ `( )` / 文字クラス `[..] [^..] a-z` / ドット `.` / エスケープ `\d \w \s \n \t \r` と記号のエスケープ（`\.` `\*` `\\` など）

**エラーになる（対処法もエラーメッセージに出る）**:
- `^` `$` — `test()` は元々全体一致（`^…$` 相当）なので外す。部分一致がしたい場合は `--search`
- `\b` `\B` `\D` `\W` `\S` など未対応のエスケープ — 別の書き方に言い換える（例: `\D` → `[^0-9]`）
- `\1` などの後方参照 — 非対応（下記「設計の境界」参照）。書き換えが必要
- `(?:...)` `(?=...)` `(?<name>...)` などの拡張グループ — `(?:...)` は `(...)` に置換すれば等価（本エンジンは捕獲なし）。先読み等は非対応

`{n,m}` はそのまま動く。非貪欲 `*? +? ??` は付けても意味が変わらない（DFA はマッチ有無だけを見るため貪欲/非貪欲を区別しない）。

## Codex を使う場合

[AGENT_PROMPTS.md](./AGENT_PROMPTS.md) の固定プロンプトは Claude Code / Codex どちらにもそのまま貼り付けて使える。

## コード地図

| ファイル | 役割 | 当日 |
|---|---|---|
| `src/ast.ts` | AST 型・`canonicalKey`・1文字ヘルパ | 完成品（読む） |
| `src/derivative.ts` | **`nullable` / `derivative`（コア30行）** | **start で穴埋め（山場①）** |
| `src/normalize.ts` | スマートコンストラクタ（ACI 正規化） | **start で素朴実装→②で正規化に育てる** |
| `src/match.ts` | `fullMatch` / 遅延DFA `LazyDfa` / `toSearch` | 完成品 |
| `src/parser.ts` | 正規表現文字列 → AST | 完成品（③で持ち帰り再生成デモ） |
| `src/index.ts` | 公開API `compile` | 完成品 |
| `tests/spec.test.ts` | 意味論テスト（stage1）。`a?b` トラップ・未対応構文のエラーテスト含む | 山場①でこれを緑にする |
| `tests/linear.test.ts` | 線形性・状態数収束テスト（stage2） | ②でこれを緑にする |
| `SPEC.md` | 基本設計＝規則表（プロンプトの素） | 山場で固める |
| `AGENT_PROMPTS.md` | Claude Code / Codex 投入用の固定プロンプト | 各段で使う |
| `TEACHING.md` | 講師用の分単位台本・救済ルート・声かけ集 | 講師のみ |

---
教材作成: 2026-06（大阪ハンズオン用）。設計手法は Brzozowski derivatives（1964）。
