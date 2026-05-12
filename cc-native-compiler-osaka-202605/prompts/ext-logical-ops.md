# 言語拡張プロンプト：`&&` / `||` / `!`（短絡評価）

> nb-lang の **既に動いている実装**に論理演算子（短絡評価）を追加するためのプロンプト。
> Claude Code / Codex に `prompts/<言語>.md` と一緒に、または完成済みの実装に追加で渡してください。

## 仕様

論理演算 3 種を **短絡評価**で実装する：

- `a && b` — `a` が偽（`0`）なら `b` は評価せず `0` を返す
- `a || b` — `a` が真（非 `0`）なら `b` は評価せず `1` を返す
- `!a`     — `a` が偽（`0`）なら `1`、それ以外は `0`

優先順位（低い順）：
```
|| < && < == != < > <= >= < + - < * / % < unary（! と -）
```

例：
```
val x = 5;
if (x > 0 && x < 10) {
  print(1);
}
if (x == 0 || x == 5) {
  print(2);
}
print(!0);
print(!1);
```
期待出力：
```
1
2
1
0
```

## 各層への変更点

### Lexer
- 2 文字オペレータ `&&` / `||` を追加（既存の `==` `!=` `<=` `>=` と同じ扱い）
- 1 文字オペレータ `!` を追加

### Parser
- 優先順位レベルを 2 段増やす：
  ```
  expr           = orExpr ;
  orExpr         = andExpr ( "||" andExpr )* ;
  andExpr        = comparison ( "&&" comparison )* ;
  comparison     = additive ( cmpOp additive )* ;
  ...
  unary          = ( "-" | "!" ) postfix | postfix ;
  ```
- `!` は unary で吸収する

### AST
- `Expr` に追加：`And(l, r)`, `Or(l, r)`, `Not(e)`
- `BinOp` で表現してもいいが、**短絡評価のため CodeGen で特別扱いが必要**なので、専用ノードにする方が綺麗

### TypeCheck
- `&&` `||` `!` の引数は **int**（bool 兼用、0/1 を期待）
- 結果も int

### CodeGen — **ここが本題**

`a && b` の **短絡評価** を basic block で表現：

```llvm
  ; 評価 a → %a
  %a = ...
  %a.bool = icmp ne i64 %a, 0
  br i1 %a.bool, label %and.rhs, label %and.end

and.rhs:
  ; 評価 b → %b
  %b = ...
  %b.bool = icmp ne i64 %b, 0
  %b.i64 = zext i1 %b.bool to i64
  br label %and.end

and.end:
  %and.result = phi i64 [ 0, %<entry前ブロック> ], [ %b.i64, %and.rhs ]
```

`||` は then/else の真偽が逆になるだけ。`!` は単純に `icmp eq i64 %x, 0` → `zext`。

**ポイント：`phi` を使うのが SSA らしい書き方**。`phi` の `[ value, predecessor ]` で
「どの直前ブロックから来たか」を指定する。entry block の名前を正しく追跡する必要があるので、
genExpr が現在の basic block 名を返せるよう少しリファクタが必要。

**代替案（phi を避ける）：** alloca した一時変数に書き込む方式でも OK。
コードはやや冗長になるが、既存の env スタイルと整合する。

```llvm
  %tmp = alloca i64
  store i64 0, ptr %tmp
  %a = ...
  %a.bool = icmp ne i64 %a, 0
  br i1 %a.bool, label %and.rhs, label %and.end
and.rhs:
  %b = ...
  %b.bool = icmp ne i64 %b, 0
  %b.i64 = zext i1 %b.bool to i64
  store i64 %b.i64, ptr %tmp
  br label %and.end
and.end:
  %and.result = load i64, ptr %tmp
```

## 追加テスト

`examples/ext_logical.nb`：
```
val x = 5;
if (x > 0 && x < 10) {
  print(1);
}
if (x == 0 || x == 5) {
  print(2);
}
print(!0);
print(!1);
```
期待出力：
```
1
2
1
0
```

短絡評価の確認用 `examples/ext_short_circuit.nb`：
```
function side(): int {
  print(99);     // この行が呼ばれたら短絡失敗
  return 1;
}

if (0 && side()) {
  print(0);
} else {
  print(1);      // こちらだけが出るはず
}
```
期待出力（99 は出ない）：
```
1
```

## プロンプト雛形（コピペ可）

```text
@prompts/<言語>.md で作った nb-lang の実装に、論理演算子 && / || / ! を追加してください。
**必ず短絡評価で実装**してください（右辺を不要に評価しない）。

（このファイルの「仕様」と「各層への変更点」セクションをペースト）

追加後、examples/ext_logical.nb が "1\n2\n1\n0" を、
examples/ext_short_circuit.nb が "1"（99 は出ない）を出すことを確認してください。
既存テスト（sum.nb / fact.nb / strlist.nb）が壊れていないことも併せて検証。
```
