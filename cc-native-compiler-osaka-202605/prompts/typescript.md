# 作る言語 "nb-lang" の仕様（Claude Code への提示用プロンプト）

> このファイルは、ハンズオン中に Claude Code に渡す初期プロンプトの土台です。
> そのまま貼るのでなく、各自の理解に合わせて調整してください。

---

## 概要

"nb-lang" は、**整数/文字列/リストを扱う静的型付き手続き型言語** です。
今日はこの言語の **ネイティブコンパイラ** をTypeScript（[Bun](https://bun.sh/) 1.0+、`bun run main.ts` で直実行）で作ります。

「AST を組み立てて LLVM IR を文字列で吐く」という形で実装します。

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

### 型推論ルール（簡易版）

完全な型推論は重いので、以下の最小ルールで割り切る：

1. **`val x = expr;`** — `expr` の型を見て `x` の型を決める
2. **`var x = expr;`** — 同上、ただし以後の `x = expr2` は `x` の型と一致する `expr2` のみ許可
3. **関数引数・戻り値** — 型注釈必須、推論しない
4. **二項演算** — 両辺の型が一致する必要あり（`int + int → int`、`string + string` は今回サポート外）
5. **比較演算** — `int` 同士、結果は `bool`（IR 上は `i1`）
6. **リストリテラル `[a, b, c]`** — 全要素が同じ型 `T` で、結果は `list<T>`
7. **インデックスアクセス `xs[i]`** — `xs: list<T>`, `i: int`、結果は `T`

### 型エラーの例

```
val n = 10;
val s = "hello";
val bad = n + s;     // ← エラー：int + string は許されない

var sum = 0;
sum = "oops";        // ← エラー：var sum の型は int に固定された

val xs = [1, 2, "three"];   // ← エラー：要素型が int / string で混在
```

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

## バックエンド方針の選択肢

`backend-strategy.md` で 3 プラン（A: LLVM IR / B: C / C: アセンブリ .s）を解説。
**最初は A（LLVM IR）**を推奨、詰まったら B（C 経由）に切り替え。
プラン C（.s 直書き）は環境差が大きいので、Claude Code / Codex に任せる前提で挑戦するなら可。

## 補足：Claude Code との付き合い方

- 一度に全部お願いせず、**段階的に進める**（Lexer → Parser → TypeCheck → CodeGen、Phase 1 → 2 → 3）
- 生成コードを読んで、「ここ怪しい」と思ったら即突っ込む
- テストコードも一緒に書かせる（各言語の標準テストランナーで）
- LLVM IR の生成部分は、まずごく簡単な `print(42);` が通ることを確認してから拡張
- Phase 1 が通ったら、それ自体が大きな成果。Phase 2/3 は欲張り枠と割り切る
# バックエンド戦略（Claude Code への提示用プロンプト）

> 言語仕様（`language-spec.md`）と併せて Claude Code に渡すと、
> コード生成の方向性がブレにくくなります。

---

## 方針：LLVM IR 経由

`nb-lang` のコンパイラは、**LLVM IR を文字列として出力する** 形で実装します。

理由：

- LLVM IR はテキスト形式で、どの言語でも文字列連結で生成できる
- レジスタ割り当て・最適化・機械語生成は `llc` / `clang` に完全に任せられる
- 環境ごとに `target triple` を変えれば、macOS arm64 / Linux x86-64 / WSL2 で同じバックエンドが動く

## 出力とビルドの流れ

```
nb-lang source (example.nb)
  └─> [自作コンパイラ（TS）]
       └─ Lexer → Parser → AST → CodeGen
                                    │
                                    ▼
                               example.ll (LLVM IR テキスト)
                                    │
                                    └─> $ clang example.ll -o a.out
                                          └─> $ ./a.out
```

## 環境別 target triple（重要：2 バリアント）

実行環境ごとに先頭の `target triple` を切り替える必要があります。

| 環境 | target triple |
|------|---------------|
| macOS (Apple Silicon) | `arm64-apple-macosx15.0.0` |
| Linux x86-64 / WSL2 | `x86_64-pc-linux-gnu` |

triple が現環境と違うと clang が override 警告を出します。実装では `uname` 等で検出して
書き分けるか、`process.platform` で分岐するのが楽。

```typescript
const triple = process.platform === "darwin"
  ? "arm64-apple-macosx15.0.0"
  : "x86_64-pc-linux-gnu";
```

## LLVM 15+ の opaque pointer（重要）

現代の LLVM（15+）では typed pointer (`i8*`, `[5 x i8]*`) は **廃止** され、
**全てのポインタ型は `ptr`** に統一されています。

古い資料に出てくる `i8*` や `getelementptr [5 x i8], [5 x i8]* @fmt, i32 0, i32 0`
のような書き方は Apple clang 16 以降で警告が出るため、**全て `ptr` に統一**してください。

```llvm
; 古い（NG）
declare i32 @printf(i8*, ...)
%0 = call i32 (i8*, ...) @printf(i8* getelementptr ([5 x i8], [5 x i8]* @fmt, i32 0, i32 0), i64 42)

; 新しい（OK）
declare i32 @printf(ptr, ...)
%0 = call i32 (ptr, ...) @printf(ptr @fmt, i64 42)
```

## Hello World — 完全動作例

これを `hello.ll` に保存して `clang hello.ll -o hello && ./hello` で `42` が出る：

```llvm
; ModuleID = 'nb-lang'
target triple = "arm64-apple-macosx15.0.0"   ; Linux なら "x86_64-pc-linux-gnu"

@fmt = private constant [5 x i8] c"%ld\0A\00"
declare i32 @printf(ptr, ...)

define i32 @main() {
entry:
  call i32 (ptr, ...) @printf(ptr @fmt, i64 42)
  ret i32 0
}
```

**動作検証済み**：
- macOS arm64 (Apple clang 16.0.0) ✓
- Linux x86-64 / WSL2: target triple 差し替えで通る想定（要 ryzen-laptop で検証）

---

## Phase 1 — 整数演算・変数・if・while・print

### 変数 (alloca + store/load)

```llvm
%x = alloca i64, align 8
store i64 10, ptr %x
%v = load i64, ptr %x
```

### 演算 (add / sub / mul / sdiv / srem)

```llvm
%sum  = add  i64 %a, %b
%diff = sub  i64 %a, %b
%prod = mul  i64 %a, %b
%quot = sdiv i64 %a, %b
%rem  = srem i64 %a, %b
```

### 比較 (icmp)

```llvm
%cond = icmp slt i64 %a, %b   ; signed less than
; eq, ne, slt, sle, sgt, sge
```

### 制御フロー (br) — if/else

```llvm
  br i1 %cond, label %then, label %else
then:
  ; ...
  br label %end
else:
  ; ...
  br label %end
end:
  ; ...
```

### while ループ

```llvm
  br label %cond
cond:
  %c = icmp slt i64 %i, %n
  br i1 %c, label %body, label %exit
body:
  ; ...
  br label %cond
exit:
  ; ...
```

### Phase 1 統合例（1〜10 の和、`./a.out` で `55` 出力）

**動作検証済み（macOS arm64）**

```llvm
; ModuleID = 'nb-lang'
target triple = "arm64-apple-macosx15.0.0"

@fmt = private constant [5 x i8] c"%ld\0A\00"
declare i32 @printf(ptr, ...)

define i32 @main() {
entry:
  %n = alloca i64, align 8
  %sum = alloca i64, align 8
  %i = alloca i64, align 8
  store i64 10, ptr %n
  store i64 0, ptr %sum
  store i64 1, ptr %i
  br label %cond

cond:
  %i.val = load i64, ptr %i
  %n.val = load i64, ptr %n
  %c = icmp sle i64 %i.val, %n.val
  br i1 %c, label %body, label %exit

body:
  %sum.val = load i64, ptr %sum
  %i.val2 = load i64, ptr %i
  %newsum = add i64 %sum.val, %i.val2
  store i64 %newsum, ptr %sum
  %i.val3 = load i64, ptr %i
  %newi = add i64 %i.val3, 1
  store i64 %newi, ptr %i
  br label %cond

exit:
  %final = load i64, ptr %sum
  call i32 (ptr, ...) @printf(ptr @fmt, i64 %final)
  ret i32 0
}
```

---

## Phase 2 — 関数定義・呼び出し

関数定義は `define`、呼び出しは `call`。`ret` で値を返す。再帰も普通に書ける。

### 関数定義の書き方ポイント

- 引数：`define i64 @func(i64 %a, i64 %b)`
- 戻り値型：`define <ret_ty> @name(...)`
- `ret void` で戻り値なし
- 末尾で `ret` を必ず置く（`alloca` した変数は関数終了で自動解放）

### 階乗の例（`fact(5)` で `120` 出力）

**動作検証済み（macOS arm64）**

```llvm
; ModuleID = 'nb-lang'
target triple = "arm64-apple-macosx15.0.0"

@fmt = private constant [5 x i8] c"%ld\0A\00"
declare i32 @printf(ptr, ...)

define i64 @fact(i64 %n) {
entry:
  %cmp = icmp sle i64 %n, 1
  br i1 %cmp, label %then, label %else

then:
  ret i64 1

else:
  %sub = sub i64 %n, 1
  %rec = call i64 @fact(i64 %sub)
  %mul = mul i64 %n, %rec
  ret i64 %mul
}

define i32 @main() {
entry:
  %r = call i64 @fact(i64 5)
  call i32 (ptr, ...) @printf(ptr @fmt, i64 %r)
  ret i32 0
}
```

---

## Phase 3 — 文字列・リスト

### 文字列リテラル（`hello` 出力）

**動作検証済み（macOS arm64）**

```llvm
; ModuleID = 'nb-lang'
target triple = "arm64-apple-macosx15.0.0"

@strfmt = private constant [4 x i8] c"%s\0A\00"
@hello = private constant [6 x i8] c"hello\00"
declare i32 @printf(ptr, ...)

define i32 @main() {
entry:
  call i32 (ptr, ...) @printf(ptr @strfmt, ptr @hello)
  ret i32 0
}
```

ポイント：

- 文字列は `private constant [N x i8] c"..."` でグローバルに置く
- `\0A` は LF (0x0A)、`\00` は終端 NUL
- 配列長 `N` は **NUL 終端を含む**バイト数（`hello` は 6 = `h`,`e`,`l`,`l`,`o`,`\0`）

### リスト（malloc ベース動的配列、`[1,2,3,4,5]` の和で `15` 出力）

**動作検証済み（macOS arm64）**

```llvm
; ModuleID = 'nb-lang'
target triple = "arm64-apple-macosx15.0.0"

@fmt = private constant [5 x i8] c"%ld\0A\00"
declare i32 @printf(ptr, ...)
declare ptr @malloc(i64)

define i32 @main() {
entry:
  ; xs = malloc(5 * 8 bytes)
  %xs = call ptr @malloc(i64 40)
  %p0 = getelementptr i64, ptr %xs, i64 0
  store i64 1, ptr %p0
  %p1 = getelementptr i64, ptr %xs, i64 1
  store i64 2, ptr %p1
  %p2 = getelementptr i64, ptr %xs, i64 2
  store i64 3, ptr %p2
  %p3 = getelementptr i64, ptr %xs, i64 3
  store i64 4, ptr %p3
  %p4 = getelementptr i64, ptr %xs, i64 4
  store i64 5, ptr %p4

  %total = alloca i64
  %i = alloca i64
  store i64 0, ptr %total
  store i64 0, ptr %i
  br label %cond

cond:
  %i.val = load i64, ptr %i
  %c = icmp slt i64 %i.val, 5
  br i1 %c, label %body, label %exit

body:
  %total.val = load i64, ptr %total
  %i.val2 = load i64, ptr %i
  %elemptr = getelementptr i64, ptr %xs, i64 %i.val2
  %elem = load i64, ptr %elemptr
  %newtotal = add i64 %total.val, %elem
  store i64 %newtotal, ptr %total
  %newi = add i64 %i.val2, 1
  store i64 %newi, ptr %i
  br label %cond

exit:
  %final = load i64, ptr %total
  call i32 (ptr, ...) @printf(ptr @fmt, i64 %final)
  ret i32 0
}
```

ポイント：

- リストは `malloc(要素数 * 要素サイズ)` で確保（i64 要素なら要素サイズは 8）
- 要素アクセスは `getelementptr i64, ptr %xs, i64 <index>` でアドレス取得
- `free` は省略（短命プログラム前提、GC は実装しない）
- 異なる要素型のリスト（`list<string>` 等）が必要なら、要素型に応じてサイズを変える

---

## ビルドコマンドと環境差

### macOS (Apple Silicon)

```bash
clang hello.ll -o hello
./hello
```

何もオプションいらない。Apple clang が SDK パスやリンカを自動解決。

### Linux x86-64 / WSL2

```bash
clang hello.ll -o hello
./hello
```

通常はこれで通る。distro によっては以下のオプションが必要なことがあります：

- 一部 Ubuntu: `-no-pie`（PIE 関連のリンクエラーが出たら付ける）
- glibc 不一致: `-fuse-ld=lld` で代替リンカを使うと解消することあり

### IR 最適化（任意）

```bash
clang -O2 hello.ll -o hello   # 最適化レベル指定
```

最初は `-O0` 相当（無指定）で十分。動いてから `-O2` を試す。

---

## 詰まりやすい箇所

1. **target triple バージョンの不一致**
   - macOS は `arm64-apple-macosx<実 SDK バージョン>`。違うバージョンだと警告
   - 警告無視で動くが、気になるなら現行 SDK バージョンを取得して書く

2. **opaque pointer (`ptr`) と typed pointer (`i8*`) の混在**
   - Apple clang 16+ は opaque pointer 前提。`i8*` `[N x i8]*` は警告
   - **全部 `ptr` に統一**するのが正解

3. **SSA 形式のラベル管理**
   - 各 basic block はただ一つの `ret` / `br` で終わる
   - 同じレジスタ名を 2 回代入しないよう、カウンタで連番を振る

4. **`printf` の宣言**
   - `declare i32 @printf(ptr, ...)` を必ず置く
   - 第 1 引数のフォーマット文字列は global constant として確保

5. **`getelementptr` のインデックス**
   - 配列要素へは `getelementptr <elem_ty>, ptr %base, i64 <index>`
   - 構造体メンバへは `i32 N` でアクセス

---

## Claude Code への指示例

```
以下の仕様で、nb-lang の AST を LLVM IR に変換するコードジェネレータを
TypeScriptで実装してほしい。

要件：
- target triple は実行環境を検出して書き分ける（macOS arm64 / Linux x86-64）
- opaque pointer (`ptr`) を使う（typed pointer は使わない）
- Phase 1 → 2 → 3 と段階的に育てる
- まず print(42); が通るところまで作って、それから変数・演算・制御構造を追加
- CodeGen は可変長の文字列バッファ（StringBuilder 相当）で IR を組み立てる
- %名前 の連番は counter で管理
- basic block ラベルも counter で管理
- 変数は alloca / load / store で扱う

（このファイルの Phase 1 統合例 IR をペースト）

ビルド検証：
- 出力 IR を `out.ll` として保存
- `clang out.ll -o a.out && ./a.out` で期待値が出ることを確認
- macOS arm64 と Linux x86-64 で target triple を切り替えてビルドできるよう
  CodeGen に環境検出ロジックを入れる
```

---

## フォールバック戦略

もし 60 分で LLVM IR がキツければ、以下に切り替え：

### プラン B：C を吐いて clang に投げる

```c
#include <stdio.h>
long x;
int main() {
    x = 10;
    printf("%ld\n", x);
    return 0;
}
```

- 既存の C のセマンティクスに丸乗りできる
- 実装言語から文字列連結で生成
- `clang example.c -o a.out`
- ネイティブバイナリは出るので「ネイティブコンパイラ」の看板は守れる

### プラン C：アセンブリ (.s) を吐いてリンカで処理

LLVM IR への依存を避けたい場合、ターゲット環境のアセンブリを直接吐く方法もあります。

```bash
# 自作コンパイラが out.s を出力
clang out.s -o a.out
./a.out
```

- macOS arm64 と Linux x86-64 で **アセンブリの方言が完全に違う**
  - macOS arm64: AArch64 アセンブリ（`bl`, `ret`, `mov` 等、Apple は独自ディレクティブ多め）
  - Linux x86-64: x86-64 アセンブリ（AT&T 構文 or Intel 構文）
- 環境ごとに別の CodeGen バックエンドが必要になる
- **環境別の細かい差異は Claude Code / Codex に任せる**のが現実的（手書きで覚えるのは大変）
- ABI（呼び出し規約・スタックフレーム・スタックアラインメント）も環境差あり
- macOS arm64 では `_main` のように関数名にアンダースコア接頭辞が必要

**Claude Code への指示例（プラン C）**：

```text
LLVM IR を経由せず、以下の環境向けのアセンブリを直接吐く CodeGen に
書き換えてほしい。OS/アーキは uname で実行時に検出する。

- macOS arm64: AArch64 アセンブリ（Apple の関数名規約を遵守）
- Linux x86-64: x86-64 AT&T 構文アセンブリ

最初は print(42); が `clang out.s -o a.out && ./a.out` で 42 を出す
ところまで作る。それから変数・演算・制御フローを追加する。
```

- リンクは `clang` がリンカを呼び出してくれる（`ld` を直接叩かなくてOK）
- 「ネイティブコンパイラ」感は **プラン B より強い**（実機械語に近い）が、移植性が下がる
# TypeScript (Bun) 用 nb-lang コンパイラ実装プロンプト

このファイルは **TypeScript で nb-lang のネイティブコンパイラを実装する**ための
Claude Code 向けプロンプト集です。実行環境は [Bun](https://bun.sh/) を想定しています。

## 使い方

このファイルと一緒に、以下も Claude Code に渡してください（同じディレクトリにあります）：

- `language-spec.md` — nb-lang の仕様（字句・構文・意味論・例示プログラム）
- `backend-strategy.md` — LLVM IR 生成戦略・IR パターン・ビルド方法

3 つを `@language-spec.md @backend-strategy.md @prompt-typescript.md` のように
同時に Claude Code へ渡せば、初期プロンプトから一気にブートストラップできます。

---

## AST 設計例

```typescript
type Expr =
  | { kind: "IntLit"; value: number }
  | { kind: "StrLit"; value: string }
  | { kind: "Var"; name: string }
  | { kind: "BinOp"; op: string; left: Expr; right: Expr }
  | { kind: "Call"; name: string; args: Expr[] }
  | { kind: "Index"; arr: Expr; idx: Expr }
  | { kind: "ListLit"; elems: Expr[] };

type Stmt =
  | { kind: "ValDef"; name: string; ty?: Type; init: Expr }
  | { kind: "VarDef"; name: string; ty?: Type; init: Expr }
  | { kind: "Reassign"; name: string; value: Expr }
  | { kind: "If"; cond: Expr; thenBlk: Stmt[]; elseBlk: Stmt[] }
  | { kind: "While"; cond: Expr; body: Stmt[] }
  | { kind: "Print"; value: Expr }
  | { kind: "Return"; value: Expr }
  | { kind: "ExprStmt"; value: Expr };

type FunDef = {
  name: string;
  params: [string, Type][];
  retType: Type;
  body: Stmt[];
};

type Type =
  | { kind: "TInt" }
  | { kind: "TString" }
  | { kind: "TList"; elem: Type };
```

---

## 初期プロンプト（コピペ可）

```text
TypeScript で、小さな言語 "nb-lang" のネイティブコンパイラを実装したい。
LLVM IR を文字列として吐き、clang でリンクしてネイティブバイナリを作る方針。

まず Phase 1（整数演算 / 変数 / if / while / print）から実装する。

要件：
- Bun 1.0+ で `bun run main.ts <source.nb>` で直接実行
- AST は discriminated union （`{ kind: "..." }` 形式）で表現
- 外部ライブラリは使わない（Bun 標準と組み込み型のみ、`node:fs` など Node 互換 API は OK）
- LLVM IR は配列に push して `join("\n")` で組み立てる
- target triple は process.platform で書き分ける
  （darwin → arm64-apple-macosx15.0.0、linux → x86_64-pc-linux-gnu）

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

該当箇所のコードを直してほしい。discriminated union の `kind` で
分岐漏れがないか確認しつつ、TypeScript の型チェックが通るようにしてほしい。
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
今のディレクトリ構成と各ファイル（main.ts 内の Lexer / Parser / Ast / CodeGen
モジュール）の役割を 1 行ずつ要約してほしい。
それから、Phase 1 の最小機能（print(42); だけが動く）に立ち返って、
そこから動作確認しながら段階的に機能を追加する流れに整理し直したい。
```

### Phase 2/3 への拡張で AST がぐちゃぐちゃになった

```text
今の AST 定義（type Expr / type Stmt の discriminated union）を見直して、
以下の Phase 1〜3 の構文を全部表現できる最小の AST に整理し直してほしい。
書き直しでもいい。`kind` は文字列リテラル型で網羅判定できるように。

(language-spec.md の構文定義をペースト)
```

### バックエンドを LLVM IR から C 経由に切り替えたい

```text
LLVM IR が手に負えなくなってきたので、CodeGen を C 出力に切り替えたい。
backend-strategy.md の「プラン B」の方針で書き直してほしい。
- 出力は example.c
- ビルドは clang example.c -o a.out
- ランタイムは標準 C ライブラリの printf / malloc のみ使う

AST 構造はそのまま、CodeGen 部分だけ差し替えてほしい。
```

---

## 補足：Bun ならではの Tips

- `bun run main.ts` で TypeScript を直接実行（トランスパイル不要）
- `tsconfig.json` も `package.json` も不要、依存ゼロでスクリプト的に動く
- `node:fs` などの Node 互換 API は Bun でもそのまま使える
- AST は discriminated union (`{ kind: "..." }`) で書くと、`switch (x.kind) { case "..." }` で網羅性チェックが効く
- 進捗ログが stdout に流れる場合は `console.error()` に逃がす（IR は `process.stdout.write()` のみ）
- `target triple` は `process.platform` で判定（`"darwin"` か `"linux"` か）
