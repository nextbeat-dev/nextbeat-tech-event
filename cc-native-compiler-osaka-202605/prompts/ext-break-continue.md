# 言語拡張プロンプト：`break` / `continue`

> nb-lang の **既に動いている実装**に `break` / `continue` 文を追加するためのプロンプト。
> Claude Code / Codex に `prompts/<言語>.md` と一緒に、または完成済みの実装に追加で渡してください。

## 仕様

`while` ループの中で **早期脱出** と **次イテレーションへスキップ** を可能にする：

```
var i = 0;
var sum = 0;
while (i < 100) {
  i = i + 1;
  if (i % 2 == 0) {
    continue;       // 偶数はスキップ
  }
  if (sum > 50) {
    break;          // sum が 50 超えたら脱出
  }
  sum = sum + i;
}
print(sum);
```

期待出力（1+3+5+...+15 = 64 を超えた直後で脱出するので **64**）：
```
64
```

## 各層への変更点

### Lexer
- キーワード `break`, `continue` を追加（`KEYWORDS` セットに足すだけ）

### Parser
- `parseStatement` に `break;` `continue;` を受ける分岐を追加
- パース時点ではループ外で使われてもエラーにしない（CodeGen 側で扱う or TypeCheck で拒否）

### AST
- `Stmt` に 2 つのケースを追加：`Break`, `Continue`（引数なし）

### TypeCheck（任意）
- 厳密にやるなら「ループ外での break/continue はエラー」をここで検出する
- ループ深さを `int` で持ち回るか、`inLoop: bool` フラグで判定

### CodeGen — **ここが本題**
- **ループラベルのスタック** を CodeGen クラスに持つ。
  - 例: `private val loopStack = mutable.Stack[(condLbl, endLbl)]()`
  - while に入るとき push、抜けるとき pop
- `Break` の CodeGen: `br label %<endLbl>` を出して、その basic block を terminated 扱いに
- `Continue` の CodeGen: `br label %<condLbl>` を出して、同じく terminated 扱い
- terminator 直後にコードを出さないよう、`genStmts` の `terminated` ロジックと整合させる

### 注意：basic block の terminator 重複に気をつける

`break;` の後に同じブロック内でコードが続くと、LLVM IR では到達不能。
既存実装の `genStmts` が `terminated` を返す仕組みになっているはずなので、
`Break` / `Continue` でも `terminated = true` を返してその後の文生成を打ち切ること。

## 追加テスト

`examples/ext_break.nb`：
```
var i = 0;
var sum = 0;
while (i < 100) {
  i = i + 1;
  if (i % 2 == 0) {
    continue;
  }
  if (sum > 50) {
    break;
  }
  sum = sum + i;
}
print(sum);
```
→ `64`

`examples/ext_continue.nb`（純 continue）：
```
var i = 0;
var s = 0;
while (i < 10) {
  i = i + 1;
  if (i == 5) {
    continue;
  }
  s = s + i;
}
print(s);
```
→ `1+2+3+4+6+7+8+9+10 = 50`

## プロンプト雛形（コピペ可）

```text
@prompts/<言語>.md で作った nb-lang の実装に、break / continue 文を追加してください。
仕様と各層の変更点は以下のとおりです。

（このファイルの「仕様」と「各層への変更点」セクションをペースト）

追加後、examples/ext_break.nb が 64、examples/ext_continue.nb が 50 を出すことを
確認してください。既存テスト（sum.nb / fact.nb / strlist.nb）が壊れていないことも併せて検証。
```
