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
