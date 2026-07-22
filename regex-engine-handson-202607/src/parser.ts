/**
 * 正規表現文字列 → AST のパーサ（再帰下降）。
 *
 * このファイルは「雑だが量のある層」の代表。ハンズオン当日は Claude Code に
 * 「下のコア（ast/derivative/normalize）に対して、この構文をパースして」と投げて
 * 一気に書かせてよい層。人間が握るべきはコア設計であって、ここではない。
 *
 * 対応構文: 連接 / 選択 | / 量化子 * + ? {n} {n,} {n,m} / グループ ( ) /
 *           文字クラス [..] [^..] a-z / ドット . /
 *           エスケープ \. \* \\ など / \d \w \s \n \t \r
 * 優先順位: | < 連接 < 後置量化子 < アトム
 * 脱糖: r+ → r·r* / r? → r|ε / r{n,m} → r…r·(r|ε)… （mk* 経由でコアへ）
 *
 * 方針: 未対応の構文（^ $ \b \1 (?:...) など）は黙って別の意味に解釈せず、
 *       対処法つきの SyntaxError にする。「エラーが出ないのにマッチしない」が
 *       一番デバッグ時間を溶かすため。
 */

import { type Re, EPS, litChar, charClass, dot, type CharSet } from "./ast.js";
import { mkAlt, mkConcat, mkStar } from "./normalize.js";

const CP = {
  BAR: cp("|"), STAR: cp("*"), PLUS: cp("+"), QUES: cp("?"),
  LPAREN: cp("("), RPAREN: cp(")"), LBRACKET: cp("["), RBRACKET: cp("]"),
  LBRACE: cp("{"), RBRACE: cp("}"), COMMA: cp(","),
  DOT: cp("."), BACKSLASH: cp("\\"), CARET: cp("^"), DOLLAR: cp("$"), DASH: cp("-"),
  d: cp("d"), w: cp("w"), s: cp("s"), n: cp("n"), t: cp("t"), r: cp("r"),
} as const;

function cp(ch: string): number {
  return ch.codePointAt(0)!;
}

/** ASCII 英数字か（未知のエスケープ検出用）。 */
function isAsciiAlphaNum(c: number): boolean {
  return (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);
}

export function parse(pattern: string): Re {
  const p = new Parser(pattern);
  const re = p.parseAlt();
  p.expectEnd();
  return re;
}

class Parser {
  private readonly cps: number[];
  private i = 0;

  constructor(src: string) {
    this.cps = Array.from(src, (c) => c.codePointAt(0)!); // コードポイント単位
  }

  private peek(): number | undefined {
    return this.cps[this.i];
  }
  private next(): number | undefined {
    return this.cps[this.i++];
  }
  private eof(): boolean {
    return this.i >= this.cps.length;
  }

  parseAlt(): Re {
    let left = this.parseConcat();
    while (this.peek() === CP.BAR) {
      this.next();
      left = mkAlt(left, this.parseConcat());
    }
    return left;
  }

  parseConcat(): Re {
    let acc: Re = EPS;
    let started = false;
    while (!this.eof() && this.peek() !== CP.BAR && this.peek() !== CP.RPAREN) {
      const atom = this.parsePostfix();
      acc = started ? mkConcat(acc, atom) : atom;
      started = true;
    }
    return started ? acc : EPS; // 空の連接は ε
  }

  parsePostfix(): Re {
    let a = this.parseAtom();
    for (;;) {
      const c = this.peek();
      if (c === CP.STAR) {
        this.next();
        a = mkStar(a);
        this.skipLazyMarker();
      } else if (c === CP.PLUS) {
        this.next();
        a = mkConcat(a, mkStar(a)); // r+ = r·r*
        this.skipLazyMarker();
      } else if (c === CP.QUES) {
        this.next();
        a = mkAlt(a, EPS); // r? = r|ε
        this.skipLazyMarker();
      } else if (c === CP.LBRACE) {
        a = this.parseBraceQuantifier(a);
        this.skipLazyMarker();
      } else {
        return a;
      }
    }
  }

  /**
   * 非貪欲マーカー（*? +? ??）の '?' を読み飛ばす。
   * DFA はマッチする/しないだけを判定するため、貪欲/非貪欲は言語を変えない
   * （マッチ結果は同じ）。よって「読んで捨てる」だけで意味的に正しい。
   */
  private skipLazyMarker(): void {
    if (this.peek() === CP.QUES) this.next();
  }

  /**
   * r{n} / r{n,} / r{n,m} を読み取り、最小コアへ脱糖する。
   *  r{n}    = r·r·…（n回）
   *  r{n,}   = r^n · r*
   *  r{n,m}  = r^n · (r?)^(m-n)
   */
  private parseBraceQuantifier(atom: Re): Re {
    const start = this.i;
    this.next(); // consume '{'
    const min = this.readDigits();
    if (min === undefined) {
      this.i = start;
      throw new SyntaxError(
        "'{' の後は数字が必要です（例: a{2} / a{2,} / a{2,5}）。文字として使うには \\{ とエスケープしてください",
      );
    }
    let max: number | undefined = min;
    if (this.peek() === CP.COMMA) {
      this.next();
      max = this.readDigits(); // undefined なら上限なし（{n,}）
    }
    if (this.next() !== CP.RBRACE) {
      this.i = start;
      throw new SyntaxError("量化子 '{...}' が '}' で閉じられていません（例: a{2,5}）");
    }
    if (max !== undefined && max < min) {
      throw new SyntaxError(`'{${min},${max}}' は不正です（下限が上限を超えています）`);
    }
    let result: Re = EPS;
    for (let i = 0; i < min; i++) result = mkConcat(result, atom);
    if (max === undefined) {
      result = mkConcat(result, mkStar(atom));
    } else {
      for (let i = min; i < max; i++) result = mkConcat(result, mkAlt(atom, EPS));
    }
    return result;
  }

  /** 数字列を読んで数値化する。数字が1つも無ければ位置を戻して undefined を返す。 */
  private readDigits(): number | undefined {
    const start = this.i;
    let value = 0;
    let any = false;
    while (!this.eof()) {
      const c = this.peek()!;
      if (c < 0x30 || c > 0x39) break;
      value = value * 10 + (c - 0x30);
      this.next();
      any = true;
    }
    if (!any) {
      this.i = start;
      return undefined;
    }
    return value;
  }

  parseAtom(): Re {
    const c = this.peek();
    if (c === undefined) throw new SyntaxError("unexpected end of pattern");
    if (c === CP.LPAREN) {
      this.next();
      if (this.peek() === CP.QUES) {
        throw new SyntaxError(
          "'(?...)' 拡張グループは非対応です。(?:...) は ( に置き換えれば等価（本エンジンは捕獲なし）。先読み・名前付きグループなどは非対応です",
        );
      }
      const inner = this.parseAlt();
      if (this.next() !== CP.RPAREN) throw new SyntaxError("missing ')'");
      return inner;
    }
    if (c === CP.LBRACKET) return this.parseClass();
    if (c === CP.DOT) {
      this.next();
      return dot();
    }
    if (c === CP.BACKSLASH) {
      this.next();
      return this.parseEscape();
    }
    if (c === CP.CARET)
      throw new SyntaxError(
        "'^' は非対応です。test() は元々全体一致（^…$ 相当）なので ^ を外してください（部分一致は --search）",
      );
    if (c === CP.DOLLAR)
      throw new SyntaxError(
        "'$' は非対応です。test() は元々全体一致（^…$ 相当）なので $ を外してください（部分一致は --search）",
      );
    if (c === CP.LBRACE || c === CP.RBRACE)
      throw new SyntaxError(
        `'${String.fromCodePoint(c)}' は量化子 {n,m} 専用です。文字として使うには \\${String.fromCodePoint(c)} とエスケープしてください`,
      );
    if (c === CP.STAR || c === CP.PLUS || c === CP.QUES)
      throw new SyntaxError("dangling quantifier");
    if (c === CP.RPAREN) throw new SyntaxError("unexpected ')'");
    this.next();
    return litChar(c);
  }

  private parseEscape(): Re {
    const c = this.next();
    if (c === undefined) throw new SyntaxError("dangling backslash");
    switch (c) {
      case CP.d:
        return charClass([[48, 57]], false); // \d = [0-9]
      case CP.w:
        return charClass([[48, 57], [65, 90], [97, 122], [95, 95]], false); // \w
      case CP.s:
        return charClass([[9, 13], [32, 32]], false); // \s = [\t\n\v\f\r ]
      case CP.n:
        return litChar(10);
      case CP.t:
        return litChar(9);
      case CP.r:
        return litChar(13);
      default:
        if (c >= 0x31 && c <= 0x39) {
          // \1〜\9
          throw new SyntaxError(
            `後方参照 '\\${String.fromCodePoint(c)}' は非対応です（正則言語の表現力を超えるため。SPEC.md 末尾「あえて入れないもの」参照）`,
          );
        }
        if (isAsciiAlphaNum(c)) {
          // \0 や \b \B \D \W \S \p \u など未対応のエスケープ
          throw new SyntaxError(
            `未対応のエスケープ '\\${String.fromCodePoint(c)}' です（対応: \\d \\w \\s \\n \\t \\r と記号のエスケープ \\. \\* \\\\ など）`,
          );
        }
        return litChar(c); // \. \* \\ \( \{ \} ... → そのリテラル文字
    }
  }

  private parseClass(): Re {
    this.next(); // consume '['
    let neg = false;
    if (this.peek() === CP.CARET) {
      this.next();
      neg = true;
    }
    const ranges: CharSet[number][] = [];
    while (!this.eof() && this.peek() !== CP.RBRACKET) {
      const lo = this.classChar();
      // a-z 形式（ただし '-' の次が ']' なら普通のハイフン文字）
      if (this.peek() === CP.DASH && this.cps[this.i + 1] !== CP.RBRACKET && this.i + 1 < this.cps.length) {
        this.next(); // consume '-'
        const hi = this.classChar();
        ranges.push([lo, hi]);
      } else {
        ranges.push([lo, lo]);
      }
    }
    if (this.next() !== CP.RBRACKET) throw new SyntaxError("missing ']'");
    if (ranges.length === 0) throw new SyntaxError("empty character class");
    return charClass(ranges, neg);
  }

  private classChar(): number {
    const c = this.next();
    if (c === undefined) throw new SyntaxError("unterminated character class");
    if (c === CP.BACKSLASH) {
      const e = this.next();
      if (e === undefined) throw new SyntaxError("dangling backslash in class");
      switch (e) {
        case CP.n:
          return 10;
        case CP.t:
          return 9;
        case CP.r:
          return 13;
        default:
          if (isAsciiAlphaNum(e)) {
            throw new SyntaxError(
              `文字クラス内で未対応のエスケープ '\\${String.fromCodePoint(e)}' です（対応: \\n \\t \\r と記号のエスケープ）`,
            );
          }
          return e;
      }
    }
    return c;
  }

  expectEnd(): void {
    if (!this.eof()) throw new SyntaxError(`unexpected '${String.fromCodePoint(this.peek()!)}' at index ${this.i}`);
  }
}
