/**
 * 正規表現のAST（抽象構文木）。
 *
 * 設計のキモ: 内部表現は「最小コア」6種類だけ。
 *   ∅(Empty) / ε(Eps) / 1文字集合(Class) / 連接(Concat) / 選択(Alt) / 星(Star)
 * `+ ? {n,m} ( )` などは全てこのコアへの「脱糖(desugar)」で消す（parser.ts）。
 * こうするとマッチの中核（nullable / derivative）が6分岐で閉じる。
 */

// 判別タグ付きユニオン。全フィールド readonly（イミュータブル）。
export type Re =
  | { readonly tag: "Empty" } //                                  ∅ : 何も受理しない（空集合の言語）
  | { readonly tag: "Eps" } //                                    ε : 空文字列だけ受理
  | { readonly tag: "Class"; readonly set: CharSet; readonly neg: boolean } // 1文字: 'a' も [a-z] も . もこれ
  | { readonly tag: "Concat"; readonly left: Re; readonly right: Re }
  | { readonly tag: "Alt"; readonly left: Re; readonly right: Re }
  | { readonly tag: "Star"; readonly body: Re };

/** 文字範囲 [lo, hi]（コードポイント基準の閉区間）。 */
export type CharRange = readonly [lo: number, hi: number];
/** 文字集合: ソート済み・互いに素な閉区間の配列。 */
export type CharSet = readonly CharRange[];

export const EMPTY: Re = { tag: "Empty" };
export const EPS: Re = { tag: "Eps" };

// --- 1文字（Class）を作るヘルパ。リテラルも範囲も「.」も全部 Class に集約する ---

/** 1文字リテラル。例: 'a' → Class([[97,97]]) */
export function litChar(cp: number): Re {
  return { tag: "Class", set: [[cp, cp]], neg: false };
}

/** 文字クラス [..] / [^..]。ranges は正規化（ソート・マージ）して渡すこと。 */
export function charClass(ranges: CharSet, neg: boolean): Re {
  return { tag: "Class", set: normalizeRanges(ranges), neg };
}

/** 「.」= 改行(\n=10)以外の任意の1文字。 */
export function dot(): Re {
  return { tag: "Class", set: [[10, 10]], neg: true };
}

/** 区間配列をソートし、重なり・隣接をマージして互いに素な昇順区間にする。 */
export function normalizeRanges(ranges: CharSet): CharSet {
  if (ranges.length === 0) return ranges;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: [number, number][] = [];
  for (const [lo, hi] of sorted) {
    const last = out[out.length - 1];
    if (last && lo <= last[1] + 1) {
      last[1] = Math.max(last[1], hi);
    } else {
      out.push([lo, hi]);
    }
  }
  return out;
}

/**
 * 正規表現を「正規化後の決定的な文字列」に変換する。
 *
 * 役割:
 *  - 遅延DFAの「状態」を同一視するためのキー（構造的等価でMapキーにする）
 *  - mkAlt の重複排除・順序固定（可換性）の比較キー
 *
 * 注意: Mapキーは必ずこの「構造の文字列」を使う。オブジェクト参照をキーにすると
 *       意味的に同じ正規表現が別状態と判定され、状態が無限増殖する（=線形時間が壊れる）。
 */
export function canonicalKey(r: Re): string {
  switch (r.tag) {
    case "Empty":
      return "∅";
    case "Eps":
      return "ε";
    case "Class":
      return `[${r.neg ? "^" : ""}${r.set.map(([l, h]) => `${l}-${h}`).join(",")}]`;
    case "Concat":
      return `(${canonicalKey(r.left)}·${canonicalKey(r.right)})`;
    case "Alt":
      return `(${canonicalKey(r.left)}|${canonicalKey(r.right)})`;
    case "Star":
      return `(${canonicalKey(r.body)})*`;
  }
}
