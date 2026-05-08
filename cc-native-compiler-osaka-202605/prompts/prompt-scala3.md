# Scala 3 用 nb-lang コンパイラ実装プロンプト

このファイルは **Scala 3 で nb-lang のネイティブコンパイラを実装する**ための
Claude Code 向けプロンプト集です。

## 使い方

このファイルと一緒に、以下も Claude Code に渡してください（同じディレクトリにあります）：

- `language-spec.md` — nb-lang の仕様（字句・構文・意味論・例示プログラム）
- `backend-strategy.md` — LLVM IR 生成戦略・IR パターン・ビルド方法

3 つを `@language-spec.md @backend-strategy.md @prompt-scala3.md` のように
同時に Claude Code へ渡せば、初期プロンプトから一気にブートストラップできます。

---

## AST 設計例

```scala
enum Expr:
  case IntLit(v: Long)
  case StrLit(s: String)
  case Var(name: String)
  case BinOp(op: String, l: Expr, r: Expr)
  case Call(name: String, args: List[Expr])
  case Index(arr: Expr, idx: Expr)
  case ListLit(elems: List[Expr])

enum Stmt:
  case ValDef(name: String, ty: Option[Type], init: Expr)
  case VarDef(name: String, ty: Option[Type], init: Expr)
  case Reassign(name: String, value: Expr)
  case If(cond: Expr, thenBlk: List[Stmt], elseBlk: List[Stmt])
  case While(cond: Expr, body: List[Stmt])
  case Print(value: Expr)
  case Return(value: Expr)
  case ExprStmt(value: Expr)

case class FunDef(
  name: String, params: List[(String, Type)],
  retType: Type, body: List[Stmt]
)

enum Type:
  case TInt, TString
  case TList(elem: Type)
```

---

## 初期プロンプト（コピペ可）

```text
Scala 3 で、小さな言語 "nb-lang" のネイティブコンパイラを実装したい。
LLVM IR を文字列として吐き、clang でリンクしてネイティブバイナリを作る方針。

まず Phase 1（整数演算 / 変数 / if / while / print）から実装する。

要件：
- scala-cli プロジェクトで 5〜6 本（Main / Lexer / Parser / Ast / TypeCheck / CodeGen）
- AST は enum + case class で表現
- 外部ライブラリは使わない（Scala 標準のみ）
- LLVM IR は StringBuilder で組み立てる
- target triple は実行環境を検出して書き分ける（macOS arm64 / Linux x86-64）

最初のゴール：
- examples/sum.nb（1〜10 の和）をコンパイルして out.ll を生成、
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

該当箇所のコードを直してほしい。Scala 3 の enum マッチングを活用して、
パターンの抜け漏れがないようにしてほしい。
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
今のディレクトリ構成と各ファイル（Main.scala / Lexer.scala / Parser.scala /
Ast.scala / CodeGen.scala）の役割を 1 行ずつ要約してほしい。
それから、Phase 1 の最小機能（print(42); だけが動く）に立ち返って、
そこから動作確認しながら段階的に機能を追加する流れに整理し直したい。
```

### Phase 2/3 への拡張で AST がぐちゃぐちゃになった

```text
今の AST 定義（enum Expr / enum Stmt）を見直して、以下の Phase 1〜3 の構文を
全部表現できる最小の AST に整理し直してほしい。書き直しでもいい。
case class / enum の使い分けに気をつけて。

(language-spec.md の構文定義をペースト)
```

### バックエンドを LLVM IR から C 経由に切り替えたい

```text
LLVM IR が手に負えなくなってきたので、CodeGen を C 出力に切り替えたい。
backend-strategy.md の「プラン B」の方針で書き直してほしい。
- 出力は example.c
- ビルドは clang example.c -o a.out
- ランタイムは標準 C ライブラリの printf / malloc のみ使う

AST 構造はそのまま、CodeGen.scala だけ差し替えてほしい。
```

---

## 補足：Scala 3 / scala-cli ならではの Tips

- `scala-cli run . -- <args>` でディレクトリ内の全 `.scala` を一括コンパイル＆実行
- ファイル冒頭の `//> using scala 3.5` `//> using jvm 21` で依存指定（package.json不要）
- AST は `enum` で sum type、`case class` で product type
- パターンマッチは網羅性チェックが効く（`-Wnonexhaustive` でビルド時警告）
- `target triple` は `System.getProperty("os.name")` で取得、`startsWith("Mac")` で判定
- 進捗ログが stdout に流れる場合があるので、IR 出力は `print()` のみ／ログは `Console.err.println()` に
