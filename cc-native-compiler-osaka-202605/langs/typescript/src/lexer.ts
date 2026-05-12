// 字句解析。Token も discriminated union で kind 判別。

export type Token =
  | { kind: "TInt";   value: bigint }
  | { kind: "TStr";   value: string }
  | { kind: "TIdent"; name: string }
  | { kind: "TKw";    name: string }
  | { kind: "TOp";    op: string }
  | { kind: "TPunct"; sym: string }
  | { kind: "TEof" };

export type TokenWithPos = {
  token: Token;
  line: number;
  col: number;
};

export class LexError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "LexError";
  }
}

const KEYWORDS = new Set([
  "val", "var", "if", "else", "while",
  "print", "function", "return",
  "int", "string", "list",
]);

const TWO_CHAR_OPS = new Set(["==", "!=", "<=", ">="]);

function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

function isAlpha(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
}

function isAlnum(c: string): boolean {
  return isAlpha(c) || isDigit(c);
}

function isWhitespace(c: string): boolean {
  return c === " " || c === "\t" || c === "\n" || c === "\r";
}

export function tokenize(source: string): TokenWithPos[] {
  const result: TokenWithPos[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = source.length;

  const advance = (): void => {
    if (source[i] === "\n") { line++; col = 1; } else { col++; }
    i++;
  };

  while (i < n) {
    const c = source[i]!;
    const startLine = line;
    const startCol = col;

    if (isWhitespace(c)) {
      advance();
    } else if (c === "/" && i + 1 < n && source[i + 1] === "/") {
      while (i < n && source[i] !== "\n") advance();
    } else if (isDigit(c)) {
      let buf = "";
      while (i < n && isDigit(source[i]!)) { buf += source[i]; advance(); }
      result.push({ token: { kind: "TInt", value: BigInt(buf) }, line: startLine, col: startCol });
    } else if (isAlpha(c) || c === "_") {
      let buf = "";
      while (i < n && (isAlnum(source[i]!) || source[i] === "_")) {
        buf += source[i];
        advance();
      }
      const tok: Token = KEYWORDS.has(buf)
        ? { kind: "TKw", name: buf }
        : { kind: "TIdent", name: buf };
      result.push({ token: tok, line: startLine, col: startCol });
    } else if (c === '"') {
      advance(); // opening
      let buf = "";
      while (i < n && source[i] !== '"') {
        if (source[i] === "\\" && i + 1 < n) {
          advance();
          const esc = source[i]!;
          switch (esc) {
            case "n":  buf += "\n"; advance(); break;
            case '"':  buf += '"';  advance(); break;
            case "\\": buf += "\\"; advance(); break;
            case "t":  buf += "\t"; advance(); break;
            default:
              throw new LexError(`unknown escape: \\${esc} at line ${line} col ${col}`);
          }
        } else {
          buf += source[i];
          advance();
        }
      }
      if (i >= n) throw new LexError(`unterminated string at line ${startLine}`);
      advance(); // closing
      result.push({ token: { kind: "TStr", value: buf }, line: startLine, col: startCol });
    } else {
      const twoChar = i + 1 < n ? source.slice(i, i + 2) : "";
      if (TWO_CHAR_OPS.has(twoChar)) {
        result.push({ token: { kind: "TOp", op: twoChar }, line: startLine, col: startCol });
        advance(); advance();
        continue;
      }
      switch (c) {
        case "+": case "-": case "*": case "/":
        case "%": case "<": case ">":
          result.push({ token: { kind: "TOp", op: c }, line: startLine, col: startCol });
          advance();
          break;
        case "=":
          result.push({ token: { kind: "TOp", op: "=" }, line: startLine, col: startCol });
          advance();
          break;
        case "(": case ")": case "{": case "}":
        case "[": case "]": case ",": case ";": case ":":
          result.push({ token: { kind: "TPunct", sym: c }, line: startLine, col: startCol });
          advance();
          break;
        default:
          throw new LexError(`unexpected character '${c}' at line ${line} col ${col}`);
      }
    }
  }

  result.push({ token: { kind: "TEof" }, line, col });
  return result;
}
