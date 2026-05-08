# Claude Codeで作るネイティブコンパイラ in 大阪

- **開催日**: 2026年05月21日（木） 19:00 - 21:00
- **会場**: 株式会社ネクストビート大阪オフィス
- **connpass**: https://nextbeat.connpass.com/event/391603/

## 事前セットアップ

ハンズオンを 1 時間で走り切るため、当日のインストール作業はサポートできません。
以下のツールを **事前に**揃えて、動作確認まで済ませておいてください。

必要なものは大きく 3 つ：

1. **C/C++ ツールチェイン**（`clang` と LLVM ツール一式の両方）
2. **実装言語の処理系**（Scala 3 / TypeScript (Bun) / Java のうちお好きなもの 1 つ）
3. **Claude Code**

---

### 1. C/C++ ツールチェイン（全員必須）

LLVM IR / アセンブリを `clang` でリンクしてネイティブバイナリにします。
**clang と LLVM 一式は両方入れてください**（足りないと当日詰まる原因になる、余分に入れても害なし）。

#### macOS

```bash
xcode-select --install         # Apple 純正 clang を入れる
brew install llvm              # LLVM ツール一式（llc, opt, llvm-as 等）
clang --version                # Apple clang 16+
llc --version 2>&1 | head -1   # LLVM 18+
```

`brew install llvm` で入る `llc` / `opt` は **PATH に通っていないことがあります**。
Caveats を確認して `~/.zshrc` などに以下を足しておいてください：

```bash
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"   # Apple Silicon
# Intel Mac は /usr/local/opt/llvm/bin
```

#### Linux / WSL2 (Ubuntu / Debian 系)

```bash
sudo apt update
sudo apt install -y clang llvm
clang --version                # clang 14+ 推奨
llc --version 2>&1 | head -1
```

(Fedora / RHEL 系)

```bash
sudo dnf install -y clang llvm
```

---

### 2. 実装言語の処理系（いずれか 1 つ）

#### Scala 3（`scala-cli`）

##### macOS

```bash
brew install Virtuslab/scala-cli/scala-cli
scala-cli --version
```

##### Linux / WSL2

```bash
curl -sSLf https://scala-cli.virtuslab.org/get | sh
scala-cli --version
```

初回実行時に JDK と Scala 3 コンパイラを自動取得するので、本番前に
`scala-cli run cc-native-compiler-osaka-202605/src/scala3 -- cc-native-compiler-osaka-202605/src/examples/sum.nb`
を一度走らせて依存解決を済ませておくと安心です。

#### TypeScript（[Bun](https://bun.sh/)）

##### macOS

```bash
brew install oven-sh/bun/bun
bun --version          # 1.0+ 推奨
```

##### Linux / WSL2

```bash
curl -fsSL https://bun.sh/install | bash
# シェルを開き直すか、表示された通り PATH を通す
bun --version
```

#### Java（17 以上）

##### macOS

```bash
brew install openjdk@21    # or temurin / corretto
java --version
```

`brew` だと PATH 通しが必要なことがあります（Caveats を見てください）。
Adoptium Temurin / Amazon Corretto のインストーラ経由でも OK。

##### Linux / WSL2

```bash
sudo apt install -y openjdk-21-jdk
java --version
```

`java Main.java <args>` の **単一ファイル実行**を使うので、Java 11+ なら動きますが、
`record` / `sealed interface` を使うため **Java 17 以上**が必要です。

---

### 3. Claude Code

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) のセットアップが
済んでいて、ターミナルから対話できる状態にしておいてください。

```bash
claude --version       # 動作確認
```

API キー / サブスクリプションのどちらかで認証されていれば OK。

---

### 動作確認チェックリスト

本番前にこれらが全部通ることを確認しておくと安心です。

```bash
# ツールチェイン（両方必須）
clang --version
llc --version

# 実装言語（選んだもの 1 つ）
scala-cli --version    # Scala 3 を選んだ人
bun --version          # TypeScript を選んだ人
java --version         # Java を選んだ人

# Claude Code
claude --version
```

そのうえで、リポジトリの `cc-native-compiler-osaka-202605/src/<言語>/` を
動かして `examples/sum.nb` で `55` が出ることを確認しておくと万全です。

```bash
# 例：Scala 3
cd cc-native-compiler-osaka-202605/src/scala3
scala-cli run . -- ../examples/sum.nb > /tmp/out.ll 2>/dev/null
clang /tmp/out.ll -o /tmp/sum && /tmp/sum   # → 55

# 例：TypeScript (Bun)
cd cc-native-compiler-osaka-202605/src/typescript
bun run main.ts ../examples/sum.nb > /tmp/out.ll
clang /tmp/out.ll -o /tmp/sum && /tmp/sum   # → 55

# 例：Java
cd cc-native-compiler-osaka-202605/src/java
java Main.java ../examples/sum.nb > /tmp/out.ll
clang /tmp/out.ll -o /tmp/sum && /tmp/sum   # → 55
```

> **トラブル時：** clang で `Undefined symbols for architecture arm64` が出たら、
> 入力 IR が空 or ログ混在の可能性大。`scala-cli` の進捗ログが stdout に混ざる
> ことがあるので `2>/dev/null` で stderr を捨ててください。

## 当日配布物

### 共通（全員）

- `prompts/language-spec.md` — 作る言語の仕様
- `prompts/backend-strategy.md` — LLVM IR バックエンド戦略

### 言語別プロンプト（自分の使う言語のファイルだけ）

- **Scala 3** → `prompts/prompt-scala3.md`
- **TypeScript (Bun)** → `prompts/prompt-typescript.md`
- **Java** → `prompts/prompt-java.md`

各ファイルに **AST 設計例＋初期プロンプト＋詰まった時の対話例**がまとまっています。
ハンズオン中は `language-spec.md` `backend-strategy.md` ＋ 自分の言語の `prompt-*.md`
の **3 ファイル**を Claude Code に渡せばOKです。

### スケルトン・サンプル

- `src/scala3/Main.scala` — Scala 3 スケルトン
- `src/typescript/main.ts` — TypeScript スケルトン
- `src/java/Main.java` — Java スケルトン
- `src/examples/sum.nb` — nb-lang サンプルプログラム

## スライド（PDF）ビルド

```bash
./build-slide.sh # slide.pdf が生成
```
