# バックエンド戦略（Claude Code への提示用プロンプト）

> 言語仕様（`language-spec.md`）と併せて Claude Code に渡すと、
> コード生成の方向性がブレにくくなります。

---

## 方針：LLVM IR 経由

`nb-lang` のコンパイラは、**LLVM IR を文字列として出力する** 形で実装します。
実装言語は **Scala 3 / TypeScript / Java** のいずれかを選べます。

理由：

- LLVM IR はテキスト形式で、どの言語でも文字列連結で生成できる
- レジスタ割り当て・最適化・機械語生成は `llc` / `clang` に完全に任せられる
- 環境ごとに `target triple` を変えれば、macOS arm64 / Linux x86-64 / WSL2 で同じバックエンドが動く

## 出力とビルドの流れ

```
nb-lang source (example.nb)
  └─> [自作コンパイラ（Scala 3 / TS / Java）]
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

```scala
// Scala 3 例
val triple = System.getProperty("os.name") match
  case s if s.startsWith("Mac") => "arm64-apple-macosx15.0.0"
  case _ => "x86_64-pc-linux-gnu"
```

```typescript
// TypeScript 例
const triple = process.platform === "darwin"
  ? "arm64-apple-macosx15.0.0"
  : "x86_64-pc-linux-gnu";
```

```java
// Java 例
String triple = System.getProperty("os.name").startsWith("Mac")
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

**{LANG}** の部分を Scala 3 / TypeScript / Java のいずれかに置き換えてください。

```
以下の仕様で、nb-lang の AST を LLVM IR に変換するコードジェネレータを
{LANG} で実装してほしい。

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
