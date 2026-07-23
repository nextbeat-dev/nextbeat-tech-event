# SPEC: Brzozowski微分による正規表現エンジンの仕様

このファイルが本ハンズオンの「基本設計」そのもの。山場ではこの規則表をそのまま
Claude Code へのプロンプトに落とす。**設計表とコードが1対1に対応する**のが微分方式の強み。

## 「微分」という名前の理由

積の微分則 $(fg)' = f'g + fg'$ は「左を微分した項」＋「右を微分した項」の和。後述の連接則
$\partial_c(rs) = \partial_c(r)\cdot s \mid (\nu(r)\;?\;\partial_c(s):\emptyset)$ も第1項が「左を微分した項」、
第2項（$\nu(r)$ が有効化する）が「右を微分した項」で、構造は同型。名前は飾りでなく、規則表がこの形で書ける理由そのものである。

## AST（最小コア6種）

```
Re = ∅(Empty)              -- 何も受理しない（空集合の言語）
   | ε(Eps)                -- 空文字列だけ受理
   | Class(set, neg)       -- 1文字。'a' も [a-z] も . も全部これ（setは閉区間の配列）
   | Concat(left, right)   -- 連接 rs
   | Alt(left, right)      -- 選択 r|s
   | Star(body)            -- 星 r*
```

`+ ? {n,m} ( )` は全てこのコアへ脱糖する（パーサの仕事）。

## nullable $\nu(r)$: r は空文字列 `""` を受理するか

記号の読み方: $\nu$ はニュー（nullable）、$\partial_c$ はデル・文字cでの微分、$\wedge$ はかつ（AND）、
$\vee$ はまたは（OR）、$\cdot$ は連接。

| $r$ | $\nu(r)$ |
|---|---|
| $\emptyset$ | false |
| $\varepsilon$ | true |
| Class | false |
| $r^*$ | true |
| $rs$ | $\nu(r) \wedge \nu(s)$ |
| $r\mid s$ | $\nu(r) \vee \nu(s)$ |

## derivative $\partial_c(r)$: 文字 c で r を微分

「r がマッチする文字列のうち、先頭が c のものから c を1文字剥がした残り」にマッチする正規表現。

| $r$ | $\partial_c(r)$ |
|---|---|
| $\emptyset$ | $\emptyset$ |
| $\varepsilon$ | $\emptyset$ |
| Class | $c \in \text{class} \;?\; \varepsilon : \emptyset$ |
| $r^*$ | $\partial_c(r) \cdot r^*$ |
| $rs$ | $\partial_c(r)\cdot s \mid (\nu(r)\;?\;\partial_c(s):\emptyset)$ ←★唯一の非自明ポイント |
| $r\mid s$ | $\partial_c(r) \mid \partial_c(s)$ |

**罠**: 連接則の「$\nu(r)$ なら $\partial_c(s)$ も足す」を忘れると、`a?b`（左が $\varepsilon$ を含む連接）だけが壊れる。
他のテストは通るので発見が遅れる。`tests/spec.test.ts` の「a?b トラップ」がこれを即検出する。

## 計算例

### 主トレース: $\partial_b(\text{a?b})$ を入力 `"b"` で計算する

`a?b` は脱糖すると $(a\mid\varepsilon)\cdot b$。入力 `"b"` を1文字目 `b` で微分する。

$$
\begin{aligned}
\partial_b\bigl((a\mid\varepsilon)\cdot b\bigr)
&= \partial_b(a\mid\varepsilon)\cdot b \mid \bigl(\nu(a\mid\varepsilon)\;?\;\partial_b(b):\emptyset\bigr) &&\text{連接則}\\
\partial_b(a\mid\varepsilon) &= \partial_b(a)\mid\partial_b(\varepsilon) = \emptyset\mid\emptyset=\emptyset &&\text{第1項の材料}\\
\nu(a\mid\varepsilon) &= \nu(a)\vee\nu(\varepsilon) = \text{false}\vee\text{true} = \text{true} &&\text{第2項の条件}\\
&= (\emptyset\cdot b)\mid(\text{true}\;?\;\partial_b(b):\emptyset)\\
&= \emptyset \mid \partial_b(b) &&\text{第1項は } \emptyset\cdot b=\emptyset \text{ で消える}\\
&= \emptyset \mid \varepsilon &&\partial_b(b)=\varepsilon\\
&= \varepsilon
\end{aligned}
$$

$\nu(\varepsilon) = \text{true} \Rightarrow$ `"b"` は受理される ✅

★もし $\nu(r)\;?\;\partial_c(s):\emptyset$ の $\nu(r)$ 項を忘れて $\partial_c(rs) = \partial_c(r)\cdot s$ とだけ実装していたら、
第1項が $\emptyset$ で消えた時点で結果は $\emptyset$ のままになり、`"b"` は不受理になっていた。
`tests/spec.test.ts` の「a?b トラップ」テストがまさにこの欠落を検出する。

### 補助トレース: 同じ `a?b` を入力 `"ab"` で計算する

$$
\begin{aligned}
\partial_a\bigl((a\mid\varepsilon)\cdot b\bigr) &= \partial_a(a\mid\varepsilon)\cdot b \mid \bigl(\nu(a\mid\varepsilon)\;?\;\partial_a(b):\emptyset\bigr) = \varepsilon\cdot b \mid \emptyset = b\\
\partial_b(b) &= \varepsilon
\end{aligned}
$$

$\nu(\varepsilon) = \text{true} \Rightarrow$ `"ab"` は受理される ✅

### 収束の例: 微分を繰り返しても正規表現の種類は有限個で打ち止めになる

$ab^*$ を例に、出てくる状態を全部書き出す:

$$
\begin{aligned}
\partial_a(ab^*) &= b^* & \partial_b(ab^*) &= \emptyset\\
\partial_a(b^*) &= \emptyset & \partial_b(b^*) &= b^* &&\text{自分自身に戻る}\\
\partial_a(\emptyset) &= \emptyset & \partial_b(\emptyset) &= \emptyset &&\emptyset \text{ は何を食べても } \emptyset
\end{aligned}
$$

現れる正規表現は $\{ab^*,\ b^*,\ \emptyset\}$ の3つだけで、以降どれだけ微分してもこの3つの中を巡回する。
これが後述の遅延DFAの「状態が有限個に収まる」の最小の実例。

## マッチング

疑似コードではなく、そのまま動く TypeScript（`src/index.js` の `nullable`/`derivative`/`Re` を使用）：

```typescript
import { nullable, derivative, type Re } from "./src/index.js";

// reduce 版（数式 match(re, input) = ν( ...∂ の畳み込み... ) に対応）
function match(re: Re, input: string): boolean {
  return nullable(
    [...input].reduce<Re>(
      (state, ch) => derivative(state, ch.codePointAt(0)!),
      re,
    ),
  );
}

// for-of 版（読み下し用。挙動は同じ）
function matchLoop(re: Re, input: string): boolean {
  let state: Re = re;
  for (const ch of input) {
    state = derivative(state, ch.codePointAt(0)!);
  }
  return nullable(state);
}
```
入力を1文字ずつ食って順次微分し、最後に nullable を見るだけ。バックトラック皆無＝線形。

## 正規化（線形時間の土台・ACI）

微分は新しい正規表現を生み続ける。素朴に作ると意味的に同じ構造が無限増殖し、
遅延DFAの状態が収束しない（`(a+)+` で状態が指数爆発）。スマートコンストラクタに
最小限の正規化を内蔵して状態を有限化する：

- **mkAlt** : $r\mid\emptyset=r$, $\emptyset\mid r=r$（吸収）/ $r\mid r=r$（冪等）/ $r\mid s=s\mid r$（可換・順序固定）/ 結合フラット化
- **mkConcat** : $\emptyset\cdot r=\emptyset$, $r\cdot\emptyset=\emptyset$（零元）/ $\varepsilon\cdot r=r$, $r\cdot\varepsilon=r$（単位元）/ 右結合に固定
- **mkStar** : $\emptyset^*=\varepsilon$, $\varepsilon^*=\varepsilon$ / $(r^*)^*=r^*$

状態の同一視キー（`canonicalKey`）は**正規化後の決定的な構造文字列**を使う。
オブジェクト参照をキーにすると同じ正規表現が別状態になり、状態が無限増殖する。

## 遅延DFA

状態 = 正規化済みの正規表現。`(状態, 文字) → 次状態` をオンデマンドに構築・キャッシュ。
「微分結果をメモ化したら、勝手にDFAになっていた」——これが山場の驚き。
実行時は遷移表引きだけなので、入力長に対して線形時間。

直観としては「状態＝ここまで読んだ時点での“残りの正規表現”」——`abc` を1文字読んで
`a` を消費した状態は、`bc` にマッチすればよい状態そのもの。だから状態を別の型で
表現し直す必要がなく、正規表現がそのまま状態になる。

なお DFA（決定性有限オートマトン、deterministic finite automaton）とは、1文字読むごとに
次の状態が一意に決まり（＝決定性）、状態数が有限で、戻る操作を持たないオートマトンのこと。

## あえて入れないもの＝後方参照 `\1`

`(.+)\1` のような後方参照は正則言語の表現力を超え、DFAでは原理的に表現できない。
だから入れない。そして **入れないからこそ線形時間とReDoS耐性が保証される**。
「何を入れないかで品質が決まる」——これが本ハンズオンの設計判断の核心。
