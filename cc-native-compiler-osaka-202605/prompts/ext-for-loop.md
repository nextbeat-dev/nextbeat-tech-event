# 言語拡張プロンプト：C 風 `for` ループ

> nb-lang の **既に動いている実装**に C 風 `for` ループを追加するためのプロンプト。
> Claude Code / Codex に `prompts/<言語>.md` と一緒に、または完成済みの実装に追加で渡してください。

## 仕様

C 風 3 つ組の `for (init; cond; step) { body }` を追加：

```
for (var i = 0; i < 5; i = i + 1) {
  print(i);
}
```
期待出力：
```
0
1
2
3
4
```

意味論は **`while` への糖衣構文**：

```
for (INIT; COND; STEP) { BODY }
```
は

```
{
  INIT
  while (COND) {
    BODY
    STEP;
  }
}
```
と等価。INIT は `val` / `var` / 単純な代入を許可。STEP は `Reassign`（`x = expr`）。
INIT で導入した変数は for の中だけで有効（ブロックスコープ）。

## 各層への変更点

### Lexer
- キーワード `for` を追加（`KEYWORDS` セットに足すだけ）

### Parser
- `parseStatement` に `for (INIT COND ; STEP) BLOCK` を追加：
  ```
  for-stmt = "for" "(" stmt-init expr ";" stmt-step ")" block ;
  stmt-init = val-def | var-def | reassign | ";"  // 空 init は ";" 単体
  stmt-step = reassign  // 単純化のため reassign のみ
  ```
- 注意：INIT は **末尾の `;` を含む文**として読む（val-def / var-def は元から `;` で終わるので素直）

### AST — 2 つの方針

**方針 A：専用ノード `For(init, cond, step, body)` を追加**
- enum / sealed interface / discriminated union に `For` を追加
- CodeGen で別途処理

**方針 B：パース時に `While` + 補助に展開（desugar）**
- AST には新ノードを追加しない
- Parser が `for (INIT; COND; STEP) { BODY }` を見たら、内部で
  `[INIT, While(COND, BODY ++ [STEP])]` 相当の AST を構築

**方針 B の方が CodeGen 修正不要で楽**。教育的には方針 A も悪くない（再帰下降の構造を素直に保てる）。

### TypeCheck
- 方針 A なら `For` ケースを追加：init/step を環境付きで再帰的に check、cond は int
- 方針 B なら自動で型検査が通る

### CodeGen
- 方針 A なら `For` ケースを追加：エントリで init を実行、その後 while と同じ basic block 構造
- 方針 B なら修正不要

## 追加テスト

`examples/ext_for.nb`（基本）：
```
for (var i = 0; i < 5; i = i + 1) {
  print(i);
}
```
期待出力：`0` `1` `2` `3` `4`

`examples/ext_for_sum.nb`（合計）：
```
var total = 0;
for (var i = 1; i <= 10; i = i + 1) {
  total = total + i;
}
print(total);
```
期待出力：`55`

`examples/ext_for_scope.nb`（スコープ確認・オプション）：
```
var i = 100;
for (var i = 0; i < 3; i = i + 1) {
  print(i);
}
print(i);
```
期待出力（外側の `i` は 100 のまま）：
```
0
1
2
100
```
※ ブロックスコープが面倒なら、この挙動は省略しても OK（参加者の判断）。

## プロンプト雛形（コピペ可）

```text
@prompts/<言語>.md で作った nb-lang の実装に、C 風の for ループを追加してください。

  for (INIT; COND; STEP) { BODY }

は

  INIT
  while (COND) { BODY; STEP; }

と等価です。実装方針は **AST に専用 For ノードを足す** または
**Parser で while に desugar する** のどちらでも構いません（前者推奨：教育的）。

（このファイルの「仕様」と「各層への変更点」セクションをペースト）

追加後、examples/ext_for.nb が 0〜4 を、examples/ext_for_sum.nb が 55 を出すことを
確認してください。既存テスト（sum.nb / fact.nb / strlist.nb）が壊れていないことも併せて検証。
```
