# 作る言語 "nb-lang" の仕様（Claude Code への提示用プロンプト）

> このファイルは、ハンズオン中に Claude Code に渡す初期プロンプトの土台です。
> そのまま貼るのでなく、各自の理解に合わせて調整してください。

---

## 概要

"nb-lang" は、**整数/文字列/リストを扱う静的型付き手続き型言語** です。
今日はこの言語の **ネイティブコンパイラ** を作ります。

**実装言語は以下の 3 つからお好きなものを選べます**（サポーターがフォローできる範囲）：

- **Scala 3**（`scala-cli` / `sbt`）
- **TypeScript**（Node.js 20+, `tsx` など）
- **Java**（17 以上）

いずれの言語でも「AST を組み立てて LLVM IR を文字列で吐く」という骨子は同じです。

- フロントエンド: 字句解析 → 構文解析 → AST → 型検査
- バックエンド: AST → LLVM IR → clang でリンク → ネイティブバイナリ

## 段階実装の提案（60分を使い切るために）

一度に全機能は詰め込まず、**段階的に Claude Code に投げる**のを推奨します。

| Phase | 時間目安 | 内容 |
|-------|---------|------|
| Phase 1 | 30分 | 整数演算・変数・if・while・print（ここは必ず通す） |
| Phase 2 | 15分 | 関数定義・関数呼び出し |
| Phase 3 | 15分 | 文字列・リスト・静的型検査（到達できればボーナス） |

Phase 1 が通ったら、バイナリが一度動く達成感が手に入ります。そこから先は欲張り枠。

## 字句

- 整数リテラル: `0`, `42`, `-7`
- 文字列リテラル: `"hello"`（エスケープは `\n`, `\"`, `\\` のみ対応）
- 識別子: `[a-zA-Z_][a-zA-Z0-9_]*`
- キーワード: `val`, `var`, `if`, `else`, `while`, `print`, `function`, `return`, `int`, `string`, `list`
- 演算子: `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `<=`, `>`, `>=`
- 代入: `=`
- 区切り: `(`, `)`, `{`, `}`, `[`, `]`, `,`, `;`, `:`, `<`, `>`

## 構文（EBNF ゆるめ）

```
program        = top-decl* ;
top-decl       = function-def | statement ;

function-def   = "function" ident "(" param-list? ")" ":" type block ;
param-list     = param ("," param)* ;
param          = ident ":" type ;

statement      = val-def | var-def | reassign | if-stmt | while-stmt | print-stmt | return-stmt | expr-stmt ;
val-def        = "val" ident (":" type)? "=" expr ";" ;   (* 不変束縛 *)
var-def        = "var" ident (":" type)? "=" expr ";" ;   (* 可変束縛 *)
reassign       = ident "=" expr ";" ;                      (* var にのみ許される *)
if-stmt        = "if" "(" expr ")" block [ "else" block ] ;
while-stmt     = "while" "(" expr ")" block ;
print-stmt     = "print" "(" expr ")" ";" ;
return-stmt    = "return" expr ";" ;
expr-stmt      = expr ";" ;
block          = "{" statement* "}" ;

type           = "int" | "string" | "list" "<" type ">" ;

expr           = comparison ;
comparison     = additive ( ("=="|"!="|"<"|"<="|">"|">=") additive )* ;
additive       = multiplicative ( ("+"|"-") multiplicative )* ;
multiplicative = unary ( ("*"|"/"|"%") unary )* ;
unary          = [ "-" ] postfix ;
postfix        = primary ( call | index )* ;
call           = "(" ( expr ("," expr)* )? ")" ;
index          = "[" expr "]" ;
primary        = integer | string-lit | list-lit | ident | "(" expr ")" ;
list-lit       = "[" ( expr ("," expr)* )? "]" ;
```

## 型システム（Phase 3）

- 基本型: `int`（64bit 符号付き整数）, `string`（不変）
- 複合型: `list<T>`（動的長、要素型 `T`）
- 変数宣言時の型注釈はオプション（`:` の後ろを省略したら初回代入から推論）
- 関数定義は引数と戻り値の型注釈が必須
- 型エラーはコンパイル時に検出する

## 組み込み関数

- `print(x)` — 値を標準出力に改行付きで出力
  - `int` → `"%ld\n"`
  - `string` → `"%s\n"`
  - `list<T>` → `[e1, e2, ...]` 風に表示（簡易実装でOK）
- リストインデックス `xs[i]` は型 `T` の値を返す（境界チェックは最初は省略）

## 意味論

- 変数束縛: `val` は不変束縛（再代入不可）、`var` は可変束縛（再代入可能）
- 値カテゴリ: 整数は値渡し、文字列・リストはポインタ渡し
- 変数スコープ: 関数内のローカル変数、関数外のトップレベル変数
- メモリ管理: `malloc` しっぱなし（今回 GC は実装しない。短命プログラム前提）
- 未定義変数参照・型ミスマッチ・`val` への再代入はコンパイル時エラー

## 例示プログラム

### Phase 1 例（1〜10 の和）

```
val n = 10;
var sum = 0;
var i = 1;
while (i <= n) {
  sum = sum + i;
  i = i + 1;
}
print(sum);
```

期待出力：
```
55
```

### Phase 2 例（関数）

```
function fact(n: int): int {
  if (n <= 1) {
    return 1;
  }
  return n * fact(n - 1);
}

print(fact(5));
```

期待出力：
```
120
```

### Phase 3 例（文字列・リスト・静的型）

```
function greet(name: string): string {
  return name;
}

val xs: list<int> = [1, 2, 3, 4, 5];
var total = 0;
var i = 0;
while (i < 5) {
  total = total + xs[i];
  i = i + 1;
}

print(greet("hello"));
print(total);
```

期待出力：
```
hello
15
```

## Claude Code への初期指示例

以下をそのまま貼って、段階的に育ててください。**{LANG}** の部分は選んだ実装言語に置き換えてください。

```
{LANG} で、小さな言語 "nb-lang" のネイティブコンパイラを実装したい。
LLVM IR を文字列として吐き、clang でリンクしてネイティブバイナリを作る方針で進める。

まずは以下の仕様の Phase 1 部分を実装してほしい：
- 整数演算 / 変数 / if / while / print
- 出力は LLVM IR のテキスト

（言語仕様 Phase 1 部分をペースト）

方針：
- ファイル分割は Main / Lexer / Parser / Ast / TypeCheck / CodeGen の 6 本構成
- 外部ライブラリは使わない（標準ライブラリのみ）
- LLVM IR は文字列として書き出す
- まず Lexer と Parser を作り、動くことを確認してから CodeGen に進む
- Phase 1 が通ったら、段階的に Phase 2 (関数), Phase 3 (文字列/リスト/型) を追加
```

### 言語別の補足

- **Scala 3**：`scala-cli` で 1 ディレクトリ実行。AST は `enum` / `sealed trait` + `case class`
- **TypeScript**：`node --loader ts-node/esm` か `tsx` で実行。AST は `type` union + discriminated union
- **Java**：Java 17+ の `record` + `sealed interface` で AST を表現すると楽

## 補足：Claude Code との付き合い方

- 一度に全部お願いせず、**段階的に進める**（Lexer → Parser → TypeCheck → CodeGen、Phase 1 → 2 → 3）
- 生成コードを読んで、「ここ怪しい」と思ったら即突っ込む
- テストコードも一緒に書かせる（各言語の標準テストランナーで）
- LLVM IR の生成部分は、まずごく簡単な `print(42);` が通ることを確認してから拡張
- Phase 1 が通ったら、それ自体が大きな成果。Phase 2/3 は欲張り枠と割り切る
