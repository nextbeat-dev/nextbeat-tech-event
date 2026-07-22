/**
 * マッチング。2通り用意する。
 *  1) fullMatch: 微分を毎回計算する素朴版（バックトラックしないので既に線形だが、状態を作り直す）
 *  2) LazyDfa : 微分結果（正規化済み正規表現＝状態）をメモ化する遅延DFA。実行時は遷移表引きだけ。
 *
 * 「微分結果をメモ化したら、勝手にDFAになっていた」——これが本ハンズオンの山場の驚き。
 */

import { type Re, canonicalKey, charClass } from "./ast.js";
import { nullable, derivative } from "./derivative.js";
import { mkStar, mkConcat } from "./normalize.js";

/** 入力を1文字ずつ食って順次微分し、最後に nullable を見るだけ。バックトラック皆無＝線形。 */
export function fullMatch(re: Re, input: string): boolean {
  let state = re;
  for (const ch of input) {
    // for..of はコードポイント単位（サロゲートペア＝絵文字も安全）
    state = derivative(state, ch.codePointAt(0)!);
    if (state.tag === "Empty") return false; // ∅ に落ちたら以降ずっと∅（早期棄却）
  }
  return nullable(state);
}

/**
 * 遅延DFA。状態 = 正規化済みの正規表現。(状態, 文字) → 次状態 をオンデマンドに構築・キャッシュ。
 * 同じ入力長に対して状態数は有限（正規化のおかげ）なので、実行時は配列引きで線形時間。
 */
export class LazyDfa {
  private readonly states: Re[] = [];
  private readonly idOf = new Map<string, number>(); // canonicalKey → state id
  private readonly accept: boolean[] = [];
  private readonly trans: Map<number, Map<number, number>> = new Map(); // id → (char → next id)
  readonly startId: number;

  constructor(start: Re) {
    this.startId = this.intern(start);
  }

  private intern(r: Re): number {
    const key = canonicalKey(r);
    const hit = this.idOf.get(key);
    if (hit !== undefined) return hit;
    const id = this.states.length;
    this.states.push(r);
    this.idOf.set(key, id);
    this.accept.push(nullable(r));
    this.trans.set(id, new Map());
    return id;
  }

  /** 状態 id から文字 c で遷移。初回だけ微分し、以後はキャッシュ引き。 */
  step(id: number, c: number): number {
    const row = this.trans.get(id)!;
    const cached = row.get(c);
    if (cached !== undefined) return cached;
    const next = this.intern(derivative(this.states[id]!, c));
    row.set(c, next);
    return next;
  }

  test(input: string): boolean {
    let id = this.startId;
    for (const ch of input) id = this.step(id, ch.codePointAt(0)!);
    return this.accept[id]!;
  }

  /** 構築済みの状態数（線形性の確認・デモ用）。 */
  get stateCount(): number {
    return this.states.length;
  }
}

/**
 * 部分一致（search）= 「re にマッチする部分文字列が存在するか」。
 * 前後に「.*」を付けて全体一致に帰着させる: .* · re · .*
 * DFAなので .* が増えてもReDoSしない（バックトラック型はここが指数爆発の温床）。
 */
export function toSearch(re: Re): Re {
  // 任意文字（改行含む全コードポイント）の星。ノード生成は必ず charClass 経由で行う。
  const anyChar = charClass([[0, 0x10ffff]], false);
  const star = mkStar(anyChar);
  return mkConcat(star, mkConcat(re, star)); // .* re .*
}
