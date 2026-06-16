/**
 * 公開API。pattern をコンパイルして、全体一致(test)と部分一致(search)を提供する。
 *
 *   import { compile } from "./index.js";
 *   const re = compile("[a-z]+@[a-z]+");
 *   re.test("foo@bar");    // 全体一致
 *   re.search("...foo@bar..."); // 部分一致
 *
 * test/search はどちらも遅延DFAなので、入力長に対して線形時間（ReDoSしない）。
 */

import { parse } from "./parser.js";
import { LazyDfa, toSearch } from "./match.js";

export interface Regex {
  readonly source: string;
  /** 文字列「全体」がマッチするか（^pattern$ 相当）。 */
  test(input: string): boolean;
  /** 文字列の「どこかに」マッチするか（部分一致）。 */
  search(input: string): boolean;
  /** 全体一致用DFAの構築済み状態数（線形性の確認・デモ用）。 */
  stateCount(): number;
}

export function compile(pattern: string): Regex {
  const ast = parse(pattern);
  const full = new LazyDfa(ast);
  const search = new LazyDfa(toSearch(ast));
  return {
    source: pattern,
    test: (input) => full.test(input),
    search: (input) => search.test(input),
    stateCount: () => full.stateCount,
  };
}

// 内部APIも再エクスポート（ハンズオンで個別に触れるように）
export { parse } from "./parser.js";
export { nullable, derivative, classMatches } from "./derivative.js";
export { mkAlt, mkConcat, mkStar } from "./normalize.js";
export { fullMatch, LazyDfa, toSearch } from "./match.js";
export {
  type Re,
  type CharSet,
  type CharRange,
  EMPTY,
  EPS,
  litChar,
  charClass,
  dot,
  canonicalKey,
} from "./ast.js";
