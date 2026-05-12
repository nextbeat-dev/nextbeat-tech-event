# 言語拡張プロンプト：`string + string` 連結

> nb-lang の **既に動いている実装**に文字列連結を追加するためのプロンプト。
> Claude Code / Codex に `prompts/<言語>.md` と一緒に、または完成済みの実装に追加で渡してください。

## 仕様

`+` 演算子を **string + string → string** にもオーバーロードする。
両辺の型が一致しているときだけ動く（`int + string` などは引き続き型エラー）。

```
val a = "hello, ";
val b = "world";
print(a + b);

function greet(name: string): string {
  return "Hello, " + name + "!";
}
print(greet("Osaka"));
```
期待出力：
```
hello, world
Hello, Osaka!
```

## 各層への変更点

### Lexer / Parser / AST
- **変更不要**。既存の `BinOp("+", a, b)` をそのまま流用する。

### TypeCheck
- 現状の `+` ルール（両辺 int → int）を拡張：
  - 両辺 `int` → `int`
  - 両辺 `string` → `string`
  - それ以外 → エラー（既存の挙動を維持）
- それ以外の演算子（`-` `*` `/` `%` 比較）は **int のみ**。string は許さない。

### CodeGen — **ここが本題**

C ランタイム関数を呼び出す。グローバルに外部宣言を追加：

```llvm
declare i64 @strlen(ptr)
declare ptr @malloc(i64)
declare ptr @strcpy(ptr, ptr)
declare ptr @strcat(ptr, ptr)
```

`s1 + s2` の生成パターン：

```llvm
  ; %s1, %s2 が ptr で評価済みとする
  %len1 = call i64 @strlen(ptr %s1)
  %len2 = call i64 @strlen(ptr %s2)
  %sum  = add i64 %len1, %len2
  %size = add i64 %sum, 1                      ; NUL 終端の 1 バイト
  %buf  = call ptr @malloc(i64 %size)
  %_1   = call ptr @strcpy(ptr %buf, ptr %s1)
  %_2   = call ptr @strcat(ptr %buf, ptr %s2)
  ; 結果は %buf
```

**注意：**
- `BinOp` の CodeGen 分岐で、現在は op + 整数演算しか処理していないはず。
  `+` のときに左右の型を見て `string + string` なら上のシーケンスを出す
- 既存実装で **両辺の型が一致しているか TypeCheck が保証** しているので、
  CodeGen では `op == "+" && lt == TString` 1 条件で分岐すればよい
- `malloc` しっぱなし方針なので `free` は呼ばない

## 追加テスト

`examples/ext_strcat.nb`（基本）：
```
val a = "hello, ";
val b = "world";
print(a + b);
```
期待出力：`hello, world`

`examples/ext_strcat_chain.nb`（連鎖 + 関数）：
```
function greet(name: string): string {
  return "Hello, " + name + "!";
}
print(greet("Osaka"));
```
期待出力：`Hello, Osaka!`

`examples/ext_strcat_var.nb`（var で蓄積）：
```
var msg = "";
msg = msg + "a";
msg = msg + "b";
msg = msg + "c";
print(msg);
```
期待出力：`abc`

## プロンプト雛形（コピペ可）

```text
@prompts/<言語>.md で作った nb-lang の実装に、`string + string` の連結演算を追加してください。

TypeCheck で `+` のルールを拡張：
- int + int → int（既存）
- string + string → string（新規）

CodeGen で string 連結を実装：
- declare i64 @strlen(ptr)
- declare ptr @malloc(i64)
- declare ptr @strcpy(ptr, ptr)
- declare ptr @strcat(ptr, ptr)
を追加し、malloc(len1 + len2 + 1) → strcpy → strcat の手順で新しい文字列を作る。

（このファイルの「仕様」と「各層への変更点」セクションをペースト）

追加後、examples/ext_strcat.nb / ext_strcat_chain.nb / ext_strcat_var.nb が
それぞれ "hello, world" / "Hello, Osaka!" / "abc" を出すことを確認してください。
既存テスト（sum.nb / fact.nb / strlist.nb）が壊れていないことも併せて検証。
```
