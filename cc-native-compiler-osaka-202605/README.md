# Claude Codeで作るネイティブコンパイラ in 大阪

- **開催日**: 2026年05月21日（木） 19:00 - 21:00
- **会場**: 株式会社ネクストビート大阪オフィス
- **connpass**: https://nextbeat.connpass.com/event/391603/

## 事前セットアップ

ハンズオンを 1 時間で走り切るため、当日のインストール作業はサポートできません。
以下のツールを **事前に**揃えて、動作確認まで済ませておいてください。

必要なものは大きく 3 つ：

1. **C/C++ ツールチェイン**（`clang` と LLVM ツール一式の両方）
2. **実装言語の処理系 + ビルドツール**（Scala 3 + sbt / TypeScript + Bun / Java + Maven のうちお好きなもの 1 つ）
3. **Claude Code または Codex**（どちらでも OK）

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

### 2. 実装言語の処理系 + ビルドツール（いずれか 1 つ）

それぞれ標準的なプロジェクトレイアウト（pom.xml / build.sbt / package.json）を
使うので、対応するビルドツールも併せて入れてください。

#### Scala 3 + sbt

##### macOS

```bash
brew install sbt
sbt --version            # 1.10+ 推奨
```

JDK は sbt が自動で要求するので、`brew install openjdk@21` か Coursier (`cs`) で
先に JDK 21+ を入れておくのが楽です。

##### Linux / WSL2

```bash
# 公式 deb リポジトリ経由が確実
echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x99e82a75642ac823" | sudo apt-key add
sudo apt update && sudo apt install -y sbt openjdk-21-jdk
sbt --version
```

初回起動時に依存解決で時間がかかります。本番前に
`cd langs/scala3 && sbt 'run examples/sum.nb'`
を一度走らせて依存キャッシュを温めておくと安心です。

#### TypeScript ([Bun](https://bun.sh/))

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

プロジェクトは `package.json` + `tsconfig.json` + `src/` の標準レイアウトを使うので、
本番前に `cd langs/typescript && bun install` で依存（`@types/bun` と `typescript`）を
事前取得しておいてください。

#### Java + Maven

##### macOS

```bash
brew install openjdk@21 maven
java --version           # 21+
mvn --version            # 3.9+
```

`brew` だと PATH 通しが必要なことがあります（Caveats を見てください）。
Adoptium Temurin / Amazon Corretto + Maven バイナリ配布でも OK。

##### Linux / WSL2

```bash
sudo apt install -y openjdk-21-jdk maven
java --version
mvn --version
```

`record` / `sealed interface` / sealed switch パターンマッチを使うので
**Java 21 以上**が必須です。

本番前に `cd langs/java && mvn -q compile` で依存とプラグインを事前取得しておくと
当日のオフライン環境でも安心です。

---

### 3. Claude Code または Codex

エージェント CLI は **Claude Code / Codex のどちらでも OK**です。普段使い慣れている方を、
ターミナルから対話できる状態にしておいてください。

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)
- [Codex CLI](https://github.com/openai/codex)

```bash
claude --version       # Claude Code を使う人
codex --version        # Codex を使う人
```

それぞれ API キー / サブスクリプションのどちらかで認証されていれば OK。

---

### 動作確認チェックリスト

本番前にこれらが全部通ることを確認しておくと安心です。

```bash
# ツールチェイン（両方必須）
clang --version
llc --version

# 実装言語＋ビルドツール（選んだもの 1 セット）
sbt --version          # Scala 3 を選んだ人
bun --version          # TypeScript を選んだ人
mvn --version          # Java を選んだ人
java --version         # Scala 3 / Java を選んだ人

# Claude Code または Codex（どちらか）
claude --version
codex --version
```

そのうえで、リポジトリの `cc-native-compiler-osaka-202605/langs/<言語>/` を
動かして `examples/sum.nb` で `55` が出ることを確認しておくと万全です。

```bash
# 例：Scala 3 (sbt)
cd cc-native-compiler-osaka-202605/langs/scala3
sbt 'run examples/sum.nb'
clang examples/sum.ll -o examples/sum.out && ./examples/sum.out   # → 55

# 例：TypeScript (Bun)
cd cc-native-compiler-osaka-202605/langs/typescript
bun install
bun run src/main.ts examples/sum.nb
clang examples/sum.ll -o examples/sum.out && ./examples/sum.out   # → 55

# 例：Java (Maven)
cd cc-native-compiler-osaka-202605/langs/java
mvn -q compile exec:java -Dexec.args="examples/sum.nb"
clang examples/sum.ll -o examples/sum.out && ./examples/sum.out   # → 55
```

> **トラブル時：** clang で `Undefined symbols for architecture arm64` が出たら、
> 入力 IR が空 or ログ混在の可能性大。各ビルドツールの進捗ログが stdout に混ざる
> ことがあるので、各実装は `.ll` をファイルに直書きする設計になっています
> （`examples/<name>.ll` に書き出される）。

## 当日配布物

### 言語別プロンプト（自分の使う言語のファイル 1 つだけ渡せば OK）

各ファイルは **言語仕様＋バックエンド戦略（LLVM IR）＋AST 設計例＋初期プロンプト＋詰まった時の対話例**
が全部入りの自己完結ドキュメントです。

- **Scala 3** → [`prompts/scala3.md`](prompts/scala3.md)
- **TypeScript (Bun)** → [`prompts/typescript.md`](prompts/typescript.md)
- **Java** → [`prompts/java.md`](prompts/java.md)

ハンズオン中は自分の言語の `prompts/<言語>.md` **1 ファイル**だけ Claude Code / Codex に渡せば OK。

### リファレンス実装（参考用、3 言語とも標準レイアウト）

- `langs/scala3/` — Scala 3 + sbt（`build.sbt` + `src/main/scala/nblang/`）
- `langs/typescript/` — TypeScript + Bun（`package.json` + `tsconfig.json` + `src/`）
- `langs/java/` — Java + Maven（`pom.xml` + `src/main/java/nblang/`）

各ディレクトリの `examples/` に `sum.nb` / `fact.nb` / `strlist.nb` などの
nb-lang サンプルプログラムが入っています。

## スライド（PDF）ビルド

```bash
./build-slide.sh # slide.pdf が生成
```
