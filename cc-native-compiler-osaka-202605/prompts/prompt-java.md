# Java 用 nb-lang コンパイラ実装プロンプト

このファイルは **Java 17+ で nb-lang のネイティブコンパイラを実装する**ための
Claude Code 向けプロンプト集です。

## 使い方

このファイルと一緒に、以下も Claude Code に渡してください（同じディレクトリにあります）：

- `language-spec.md` — nb-lang の仕様（字句・構文・意味論・例示プログラム）
- `backend-strategy.md` — LLVM IR 生成戦略・IR パターン・ビルド方法

3 つを `@language-spec.md @backend-strategy.md @prompt-java.md` のように
同時に Claude Code へ渡せば、初期プロンプトから一気にブートストラップできます。

---

## AST 設計例

```java
sealed interface Expr permits IntLit, StrLit, Var, BinOp, Call, Index, ListLit {}
record IntLit(long value)                              implements Expr {}
record StrLit(String value)                            implements Expr {}
record Var(String name)                                implements Expr {}
record BinOp(String op, Expr left, Expr right)         implements Expr {}
record Call(String name, java.util.List<Expr> args)    implements Expr {}
record Index(Expr arr, Expr idx)                       implements Expr {}
record ListLit(java.util.List<Expr> elems)             implements Expr {}

sealed interface Stmt permits ValDef, VarDef, Reassign, If, While, Print, Return, ExprStmt {}
record ValDef(String name, Type ty, Expr init)         implements Stmt {}
record VarDef(String name, Type ty, Expr init)         implements Stmt {}
record Reassign(String name, Expr value)               implements Stmt {}
record If(Expr cond, java.util.List<Stmt> thenBlk,
          java.util.List<Stmt> elseBlk)                implements Stmt {}
record While(Expr cond, java.util.List<Stmt> body)     implements Stmt {}
record Print(Expr value)                               implements Stmt {}
record Return(Expr value)                              implements Stmt {}
record ExprStmt(Expr value)                            implements Stmt {}

record FunDef(String name, java.util.List<Param> params,
              Type retType, java.util.List<Stmt> body) {}
record Param(String name, Type ty) {}

sealed interface Type permits TInt, TString, TList {}
record TInt()                  implements Type {}
record TString()               implements Type {}
record TList(Type elem)        implements Type {}
```

---

## 初期プロンプト（コピペ可）

```text
Java 17+ で、小さな言語 "nb-lang" のネイティブコンパイラを実装したい。
LLVM IR を文字列として吐き、clang でリンクしてネイティブバイナリを作る方針。

まず Phase 1（整数演算 / 変数 / if / while / print）から実装する。

要件：
- Java 17 以上、`java Main.java <args>` の単一ファイル実行を想定
  （複数ファイル分けるなら javac でビルドしてもよい）
- AST は sealed interface + record で表現（パターンマッチで分岐できる）
- 外部ライブラリは使わない（JDK 標準のみ）
- LLVM IR は StringBuilder で組み立てる
- target triple は System.getProperty("os.name") で書き分ける

最初のゴール：
- examples/sum.nb をコンパイルして out.ll を生成、
  clang out.ll -o a.out && ./a.out で 55 が出ること

（language-spec.md の Phase 1 部分と backend-strategy.md の Phase 1 統合例 IR をペースト）
```

---

## 詰まった時の対話プロンプト集

### Lexer/Parser でエラーが出る

```text
今のコードで以下の入力を食わせるとエラーになる：

(エラー出力をペースト)

入力ソース：
(問題のある .nb ファイルの中身をペースト)

期待される動作：
(期待する AST 構造、または「このトークン列に分解されてほしい」を簡潔に書く)

該当箇所のコードを直してほしい。Java 21+ なら switch 式の網羅性チェックを
活用して、sealed interface のパターン抜け漏れを防いでほしい。
```

### CodeGen の出力 IR が clang で警告/エラーになる

```text
出力された IR を clang でビルドすると以下が出る：

(clang の出力をペースト)

出力 IR：
(out.ll の中身をペースト)

backend-strategy.md の動作検証済みサンプルと比べて、どこが違うか
特定して修正してほしい。
```

### 一気に書きすぎて全体把握できなくなった

```text
今のディレクトリ構成と各クラス（Main / Lexer / Parser / AST records /
CodeGen）の役割を 1 行ずつ要約してほしい。
それから、Phase 1 の最小機能（print(42); だけが動く）に立ち返って、
そこから動作確認しながら段階的に機能を追加する流れに整理し直したい。
```

### Phase 2/3 への拡張で AST がぐちゃぐちゃになった

```text
今の AST 定義（sealed interface + record 群）を見直して、以下の Phase 1〜3 の
構文を全部表現できる最小の AST に整理し直してほしい。書き直しでもいい。
permits 句の更新を忘れずに。

(language-spec.md の構文定義をペースト)
```

### バックエンドを LLVM IR から C 経由に切り替えたい

```text
LLVM IR が手に負えなくなってきたので、CodeGen を C 出力に切り替えたい。
backend-strategy.md の「プラン B」の方針で書き直してほしい。
- 出力は example.c
- ビルドは clang example.c -o a.out
- ランタイムは標準 C ライブラリの printf / malloc のみ使う

AST 構造はそのまま、CodeGen クラスだけ差し替えてほしい。
```

---

## 補足：Java 17+ ならではの Tips

- `java Main.java <args>` で単一 `.java` ファイル直接実行（Java 11+）
- `record` で簡潔にデータ型、`sealed interface` で sum type
- `instanceof` パターン（`if (e instanceof IntLit i)`）で型ガード
- Java 21+ なら switch 式の sealed パターンマッチが本格的に使える（21 未満なら if/else）
- AST records は同一 `.java` ファイル内に定義可能（public class は 1 つだけ）
- `target triple` は `System.getProperty("os.name").toLowerCase().contains("mac")` で判定
- `Files.readString(Path.of(args[0]))` でソースファイル読み込み
