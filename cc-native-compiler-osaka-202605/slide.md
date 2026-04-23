---
marp: true
theme: gaia
paginate: true
header: 'Claude Codeで作るネイティブコンパイラ'
footer: '株式会社ネクストビート'
---

<style>
  section {
    font-size: 26px;
  }
  .mermaid {
    width: 80%;
    height: 80%;
    background: none;
    border: none
  }
  .mermaid svg {
    display: block;
    min-width: 100%;
    max-width: 100%;
    max-height: 100%;
    margin: 0 auto
  }
  .mermaid .node text {
    font-size: 12px !important;
  }
</style>

<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@latest/dist/mermaid.esm.min.mjs';
mermaid.initialize({
  startOnLoad: true ,
});
</script>

# Claude Codeで作るネイティブコンパイラ

**2026年05月21日（木）**
**株式会社ネクストビート**

---

## 本日の流れ

| 時間        | 内容                                             |
| ----------- | ------------------------------------------------ |
| 19:00-19:10 | 受付・自己紹介                                    |
| 19:10-19:20 | イントロ：Claude Code × ネイティブコンパイラ      |
| 19:20-20:20 | ハンズオン（60分）                                |
| 20:20-20:50 | お寿司＋振り返り・Q&A                             |
| 20:50-21:00 | 片付け・撤収                                      |

---

## 会社紹介

<!-- TODO: ネクストビートの会社紹介（既存スライド流用可） -->

---

## イントロ：Claude Code × ネイティブコンパイラ

「Claude Codeでインタプリタは作れるらしい」——そろそろ聞き飽きた頃ではないでしょうか。

今日のテーマは、一段踏み込んで：

- **Claude Codeを相棒に、小さな言語のネイティブコンパイラを書く**
- 生成された artifacts から実バイナリが生まれ、`./a.out` で動く
- **エージェント時代のコンパイラ開発の感触**を実地で確かめる

---

## なぜ「ネイティブコンパイラ」なのか

- インタプリタは **AST を走査しながら実行**する
- コンパイラは **AST → 中間表現 → ネイティブコード** に変換する
- 後者には **型・レジスタ・ABI・リンク** など別種の難しさがある

エージェント時代、この「別種の難しさ」をどこまで預けられるか？

---

## 今日のゴール

1. **小さな言語 "nb-lang" のネイティブコンパイラ**を書く
   - 実装言語は **Scala 3 / TypeScript / Java** からお好きなものを
   - 整数演算 / 変数 / if / while / print
   - 出力：LLVM IR → clang でリンク → 実バイナリ
2. **Claude Code との協業設計**を体験する
   - 丸投げする部分と、人間が指揮する部分の切り分け
3. 動くバイナリでなんかする
   - `./a.out` を叩いて結果を見る達成感

---

## バックエンド戦略

<!-- TODO: LLVM IR 経由を基本線、代替案も軽く触れる -->

基本線：**LLVM IR を文字列として吐く → `llc` でオブジェクトコード → `clang` でリンク**

代替：
- **C を吐いて gcc/clang に任せる**（一番ラク）
- **生アセンブリを直接吐く**（手触りはあるが 1 時間では厳しい）

---

## ハンズオン（前半 30分）

**Step 1: AST と字句・構文解析**

Claude Code に渡すプロンプト例（`prompts/language-spec.md` 参照）：

> 以下の仕様の小言語 "nb-lang" の Scala 3 実装を作ってください。
> - 整数リテラル / 四則演算 / 変数代入 / if / while / print
> - (以下略、詳細は配布プロンプト)

---

## ハンズオン（後半 30分）

**Step 2: LLVM IR コード生成**

<!-- TODO: コード生成の勘所、Claude Code との詰め方 -->

- SSA 形式の IR を吐く
- レジスタ割り当ては LLVM 任せ
- 制御フロー：basic block とラベル
- `printf` の外部宣言と呼び出し

---

## まとめ

- Claude Code で **1 時間あればネイティブコンパイラは書ける**
- 肝は「**仕様と戦略を人間が決める、実装は預ける**」
- 型と ABI の境界で人間の介入が必要になる
- 今日のコードは各自の GitHub で育ててください

---

## 質疑応答・お寿司タイム

ご清聴ありがとうございました。

質問・感想・実装の疑問、お気軽にどうぞ。
