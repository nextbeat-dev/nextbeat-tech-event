# Claude Codeで作るネイティブコンパイラ in 大阪

- **開催日**: 2026年05月21日（木） 19:00 - 21:00
- **会場**: 株式会社ネクストビート大阪オフィス
- **connpass**: （TBD: 告知後にURL追記）

## 事前準備

参加者の方は、以下を事前にセットアップしておいてください。

- **実装言語の開発環境**（以下のいずれか）
  - Scala 3（`scala-cli` 推奨）
  - TypeScript（Node.js 20+, `tsx` など）
  - Java（17 以上）
- Claude Code のアカウントと動作確認済み環境
- LLVM toolchain（`llc`, `clang` 等）
  - macOS: `brew install llvm`
  - Linux (WSL2含む): `apt install llvm clang`

## 当日配布物

- `prompts/language-spec.md` — 作る言語の仕様プロンプト
- `prompts/backend-strategy.md` — バックエンド戦略プロンプト
- `src/scala3/Main.scala` — Scala 3 スケルトン
- `src/typescript/main.ts` — TypeScript スケルトン
- `src/java/Main.java` — Java スケルトン
- `src/examples/sum.nb` — nb-lang サンプルプログラム

## スライド（PDF）ビルド

```bash
./build-slide.sh # slide.pdf が生成
```
