# バックエンド戦略（Claude Code への提示用プロンプト）

> 言語仕様（`language-spec.md`）と併せて Claude Code に渡すと、
> コード生成の方向性がブレにくくなります。

---

## 方針：LLVM IR 経由

`nb-lang` のコンパイラは、**LLVM IR を文字列として出力する**形で実装します。
実装言語は **Scala 3 / TypeScript / Java** のいずれかを選べます。

理由：
- LLVM IR はテキスト形式で、どの言語でも文字列連結で生成できる
- レジスタ割り当て・最適化・機械語生成は **`llc` / `clang`** に完全に任せられる
- macOS (ARM64) / Linux (x86-64) / WSL2 の **環境差を LLVM が吸収**する

## 出力とビルドの流れ

```
nb-lang source (example.nb)
  └─> [自作コンパイラ（Scala 3 / TS / Java）]
       ├─ Lexer
       ├─ Parser
       ├─ AST
       └─ CodeGen ──> example.ll (LLVM IR テキスト)
                        │
                        └─> $ clang example.ll -o a.out
                              └─> $ ./a.out
```

## 生成する LLVM IR の最小パターン

### `print(42);` に相当

```llvm
; ModuleID = 'nb-lang'
target triple = "arm64-apple-macosx14.0.0"   ; 環境に応じて差し替え

@fmt = private constant [5 x i8] c"%ld\0A\00"
declare i32 @printf(i8*, ...)

define i32 @main() {
entry:
  %0 = call i32 (i8*, ...) @printf(i8* getelementptr ([5 x i8], [5 x i8]* @fmt, i32 0, i32 0), i64 42)
  ret i32 0
}
```

### 変数 (alloca + load/store)

```llvm
  %x.addr = alloca i64
  store i64 10, i64* %x.addr
  %x.val = load i64, i64* %x.addr
```

### 演算 (add / sub / mul / sdiv / srem)

```llvm
  %sum = add i64 %a, %b
  %diff = sub i64 %a, %b
  %prod = mul i64 %a, %b
  %quot = sdiv i64 %a, %b
  %rem = srem i64 %a, %b
```

### 比較 (icmp)

```llvm
  %cond = icmp slt i64 %a, %b   ; signed less than
  ; eq, ne, slt, sle, sgt, sge
```

### 制御フロー (br)

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

### `while` ループ

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

## 詰まりやすい箇所

1. **target triple** が環境で違う
   - macOS ARM: `arm64-apple-macosx14.0.0`
   - Linux x86-64: `x86_64-pc-linux-gnu`
   - 省略してもビルドは通ることが多い（`clang` が推測する）

2. **SSA 形式のラベル管理**
   - 各 basic block はただ一つの `ret` / `br` で終わる
   - 同じレジスタ名を 2 回代入しないよう、カウンタで連番を振る

3. **printf の呼び出し**
   - `printf` を `declare` しておかないとリンクエラー
   - 第1引数は `i8*`、フォーマット文字列は global constant で確保

## Claude Code への指示例

**{LANG}** の部分を Scala 3 / TypeScript / Java のいずれかに置き換えてください。

```
以下の仕様で、nb-lang の AST を LLVM IR に変換するコードジェネレータを
{LANG} で実装してほしい。

（上の IR サンプルをペースト）

要件：
- CodeGen は可変長の文字列バッファ（StringBuilder 相当）で IR を組み立てる
- %名前 の連番は counter で管理
- basic block ラベルも counter で管理
- 変数は alloca / load / store で扱う
- まず print(42); が通るところまで作って、それから変数・演算・制御構造を追加
- テストは llvm ir の文字列を assert する形式でもOK
```

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
