/**
 * スマートコンストラクタ（正規化を内蔵したノード生成）。
 *
 * ★ここが「線形時間」の土台★
 * Brzozowski微分は ∂c(r*) = ∂c(r)·r* のように、微分のたびに新しい正規表現を生む。
 * 素朴に作ると ε·r や r|r のような「意味は同じだが構造が違う」ノードが無限に増殖し、
 * 遅延DFAの状態が収束せず、線形時間が崩壊する（(a+)+ で状態数が指数爆発する）。
 *
 * これを防ぐのが ACI（結合則 Associativity / 可換則 Commutativity / 冪等則 Idempotence）
 * を中心とした最小限の正規化。生のオブジェクトリテラルでノードを作らず、必ずこの
 * mkAlt / mkConcat / mkStar を経由させることで、相異なる微分（=状態）を有限個に抑える。
 */

import { type Re, EMPTY, EPS, canonicalKey } from "./ast.js";

/** Alt をフラット化して項の配列にする（(a|b)|c も a|(b|c) も [a,b,c]）。 */
function altParts(r: Re): Re[] {
  return r.tag === "Alt" ? [...altParts(r.left), ...altParts(r.right)] : [r];
}

/**
 * 選択 r | s。正規化規則:
 *  - ∅|r = r, r|∅ = r        （∅ は選択の吸収単位）
 *  - r|r = r                 （冪等）
 *  - r|s = s|r               （可換 → canonicalKey でソートして順序固定）
 *  - (r|s)|t = r|(s|t)        （結合 → フラット化して一意な右畳み）
 */
export function mkAlt(a: Re, b: Re): Re {
  const byKey = new Map<string, Re>();
  for (const part of [...altParts(a), ...altParts(b)]) {
    if (part.tag === "Empty") continue; // ∅ を選択肢から除去
    byKey.set(canonicalKey(part), part); // 同一キーは1つに（冪等）
  }
  const parts = [...byKey.values()].sort((x, y) =>
    canonicalKey(x) < canonicalKey(y) ? -1 : 1,
  );
  if (parts.length === 0) return EMPTY;
  // 右畳みで一意な構造に固定（reduce は左から畳むが、順序が固定なので決定的）
  return parts.reduce((acc, x) => ({ tag: "Alt", left: acc, right: x }));
}

/**
 * 連接 r · s。正規化規則:
 *  - ∅·r = ∅, r·∅ = ∅        （∅ は連接の零元）
 *  - ε·r = r, r·ε = r        （ε は連接の単位元）
 *  - (r·s)·t = r·(s·t)        （結合 → 右結合に固定）
 */
export function mkConcat(a: Re, b: Re): Re {
  if (a.tag === "Empty" || b.tag === "Empty") return EMPTY;
  if (a.tag === "Eps") return b;
  if (b.tag === "Eps") return a;
  if (a.tag === "Concat") return mkConcat(a.left, mkConcat(a.right, b)); // 右結合へ
  return { tag: "Concat", left: a, right: b };
}

/**
 * 星 r*。正規化規則:
 *  - ∅* = ε, ε* = ε
 *  - (r*)* = r*
 */
export function mkStar(r: Re): Re {
  if (r.tag === "Empty" || r.tag === "Eps") return EPS;
  if (r.tag === "Star") return r;
  return { tag: "Star", body: r };
}
