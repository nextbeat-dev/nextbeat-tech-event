# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`cc-native-compiler` の **Java 実装**。**nb-lang**（整数 / 文字列 / リストを扱う静的型付き手続き型言語）の **ネイティブコンパイラ**を Java で書いた。
.nb ソースを読んで **LLVM IR テキスト (.ll)** を吐き、`clang` でリンクしてネイティブバイナリを生成する。

仕様の原典は `../../prompts/java.md`。設計判断で迷ったら必ず参照（字句・構文・型システム・例示プログラム・LLVM IR 生成戦略まで全部入り）。

Scala 3 版 (`../scala3/`) と TypeScript 版 (`../typescript/`) と機能・出力 IR は同等。フェーズ構造とテスト期待値も揃えてある。

## ディレクトリ構成（Maven 標準）

```
langs/java/
├── pom.xml
├── src/main/java/nblang/
│   ├── Ast.java
│   ├── Lexer.java
│   ├── Parser.java
│   ├── TypeCheck.java
│   ├── CodeGen.java
│   └── Main.java
└── examples/         (.nb サンプルプログラム)
```

## ビルド・実行

JDK 21+ と Maven 3.9+ が必要（sealed interface の switch パターンマッチを使う）。

```bash
# .nb → .ll 生成
mvn -q compile exec:java -Dexec.args="examples/sum.nb"

# .ll → ネイティブバイナリ
clang examples/sum.ll -o examples/sum.out
./examples/sum.out
```

### 個別サンプルの期待出力

| サンプル | 期待出力 | Phase |
|---|---|---|
| `examples/sum.nb` | `55` | 1（整数演算・var・while・print） |
| `examples/fact.nb` | `120` | 2（関数定義・再帰呼び出し） |
| `examples/strlist.nb` | `hello\n15` | 3（文字列・`list<int>`・型注釈） |
| `examples/bad_typemix.nb` | コンパイル時型エラー | 3（`int + string` を弾く） |
| `examples/bad_reassign.nb` | コンパイル時型エラー | 3（`var` の型固定） |
| `examples/bad_listmix.nb` | コンパイル時型エラー | 3（要素型混在） |

正常系3つ・エラー系3つを一括検証するときは：

```bash
mvn -q compile
for f in sum fact strlist; do
  mvn -q exec:java -Dexec.args="examples/$f.nb" && clang examples/$f.ll -o examples/$f.out && ./examples/$f.out
done
for f in bad_typemix bad_reassign bad_listmix; do
  mvn -q exec:java -Dexec.args="examples/$f.nb" 2>&1 | grep error
done
```

## アーキテクチャ

フェーズはコンパイラの古典的な4段：

```
.nb source
  └─> Lexer.tokenize    (Lexer.java)
       └─> Parser.parse  (Parser.java)
            └─> TypeCheck.check  (TypeCheck.java)
                 └─> CodeGen.generate  (CodeGen.java)
                      └─> .ll (LLVM IR)
                           └─> clang → ネイティブバイナリ
```

各ファイルの責務：

- **Ast.java** — `Type` / `Expr` / `Stmt` を `sealed interface` + `record` で表現。`FunDef` / `Program` / `Param` も record。網羅性チェックを効かせるため、必ず switch 式の `case` でパターンマッチする。
- **Lexer.java** — 手書きステートマシン。キーワード集合は `KEYWORDS`。`<` と `>` は演算子トークンとして出し、型 `list<T>` の文脈は Parser 側で判別する。`Token` も sealed interface。
- **Parser.java** — 再帰下降。優先順位は `comparison → additive → multiplicative → unary → postfix → primary`。`postfix` で関数呼び出し `()` とインデックス `[]` を処理。`function` キーワードのトップレベル登場でのみ関数定義に分岐する。
- **TypeCheck.java** — 環境ベースの単純型検査。`val` / `var` の可変性、関数シグネチャ照合、リスト要素型の一致、比較式の結果は `int` 扱い（LLVM 側では `i64` に zext）。
- **CodeGen.java** — LLVM IR を `StringBuilder` で組み立て。3 つのバッファを保持し最後に結合：`globalDecls`（文字列リテラル）／`funcDefs`（関数定義）／`mainBuf`（トップレベル → main 関数）。

### CodeGen の重要な不変条件

- **target triple は実行時に分岐**。macOS なら `arm64-apple-macosx15.0.0`、それ以外（Linux/WSL2）は `x86_64-pc-linux-gnu`。`targetTriple()` 1 箇所に集約。
- **opaque pointer (`ptr`) のみ**。`i8*` や typed pointer は出さない（Apple clang 16+ で警告）。
- **変数は全部 alloca / load / store**。`Map<String, VarSlot>` で名前→ポインタ・型を引く（`VarSlot` は `(String ptr, Type ty)` の record）。SSA レジスタの直接代入は使わない。
- **基本ブロックは1つの terminator で終わる**。`genStmts` は `StmtResult(env, terminated)` を返し、`return` 後の `br` を抑制する。`if-else` 両分岐が return で終わるとき endLbl は `unreachable` で締める。
- **比較演算の結果は `i64` に拡張**して扱う。`icmp` → `zext i1 to i64`。条件分岐時は `icmp ne i64 v, 0` で再度 `i1` にする（型システム上「bool」を作らず int に統一しているため）。
- **リストの要素サイズは常に 8 byte**（i64 / ptr どちらでも）。`malloc(elemCount * 8)` で確保、`getelementptr <elemTy>, ptr base, i64 idx` でアドレス計算。長さ情報は持たない（境界チェックなし、`print(list)` は `[list]` とだけ出す簡易実装）。
- **文字列リテラルはプール化**。`strPool` で同一文字列を共有し、UTF-8 バイト列を `\HH` でエスケープして `[N x i8] c"..."` に展開する。

### よくある拡張ポイント

- **新しい組み込み関数**：`Parser` に専用構文を生やすより、`funcs` マップにシグネチャを事前登録して `CodeGen` で外部 `declare` を出すのが楽。
- **リストの境界チェック・長さ取得**：今の `ptr` だけのリストでは無理。`{i64 length, ptr data}` の構造体に切り替える。`getelementptr` のインデックスが `i32 0/1` で構造体メンバを引く形になる。
- **新しい型**：`Ast.Type` の sealed interface と `CodeGen.llvmType` / `defaultRet`、`TypeCheck.sameType` の3点を同期して更新。switch 式の網羅性チェックで漏れがコンパイル時に検出される。

## Phase 1〜3 の段階構造（仕様の章立てと対応）

仕様書では機能を 3 フェーズに分けている。`examples/` のサンプルもこのフェーズ単位で揃えてあるので、機能追加するときは「どのフェーズの対応？」を意識する：

- **Phase 1**: 整数演算 / 変数 / `if` / `while` / `print`
- **Phase 2**: 関数定義・呼び出し（再帰含む）
- **Phase 3**: 文字列・リスト・静的型検査

バックエンドは LLVM IR 一択（仕様書のプラン A）。プラン B（C 経由）／プラン C（アセンブリ直書き）は採用していない。

## 環境前提

- JDK 21+（sealed switch パターンマッチ）。動作確認は OpenJDK 25 で実施。
- Maven 3.9+
- `clang` 必須（macOS デフォルトの Apple clang か Homebrew clang）
- LLVM 15+ 必須（opaque pointer 対応）

Linux / WSL2 では `target triple` が自動で `x86_64-pc-linux-gnu` に切り替わるが、リンクで `-no-pie` や `-fuse-ld=lld` が必要になる distro がある（その場合はビルドコマンド側で対応する）。
