/**
 * 正規表現文字列 → AST のパーサ（再帰下降）。
 *
 * このファイルは「雑だが量のある層」の代表。ハンズオン当日は Claude Code に
 * 「下のコア（ast/derivative/normalize）に対して、この構文をパースして」と投げて
 * 一気に書かせてよい層。人間が握るべきはコア設計であって、ここではない。
 *
 * 対応構文: 連接 / 選択 | / 量化子 * + ? / グループ ( ) / 文字クラス [..] [^..] a-z /
 *           ドット . / エスケープ \. \* \\ など / \d \w \s \n \t \r
 * 優先順位: | < 連接 < 後置量化子 < アトム
 * 脱糖: r+ → r·r* / r? → r|ε （mk* 経由でコアへ）
 */

import { type Re, EPS, litChar, charClass, dot, type CharSet } from "./ast.js";
import { mkAlt, mkConcat, mkStar } from "./normalize.js";

const CP = {
  BAR: cp("|"), STAR: cp("*"), PLUS: cp("+"), QUES: cp("?"),
  LPAREN: cp("("), RPAREN: cp(")"), LBRACKET: cp("["), RBRACKET: cp("]"),
  DOT: cp("."), BACKSLASH: cp("\\"), CARET: cp("^"), DASH: cp("-"),
  d: cp("d"), w: cp("w"), s: cp("s"), n: cp("n"), t: cp("t"), r: cp("r"),
} as const;

function cp(ch: string): number {
  return ch.codePointAt(0)!;
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
      } else if (c === CP.PLUS) {
        this.next();
        a = mkConcat(a, mkStar(a)); // r+ = r·r*
      } else if (c === CP.QUES) {
        this.next();
        a = mkAlt(a, EPS); // r? = r|ε
      } else {
        return a;
      }
    }
  }

  parseAtom(): Re {
    const c = this.peek();
    if (c === undefined) throw new SyntaxError("unexpected end of pattern");
    if (c === CP.LPAREN) {
      this.next();
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
        return litChar(c); // \. \* \\ \( ... → そのリテラル文字
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
          return e;
      }
    }
    return c;
  }

  expectEnd(): void {
    if (!this.eof()) throw new SyntaxError(`unexpected '${String.fromCodePoint(this.peek()!)}' at index ${this.i}`);
  }
}
