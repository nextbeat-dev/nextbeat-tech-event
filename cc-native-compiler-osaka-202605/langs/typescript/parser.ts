import type {
  Expr, FunDef, Param, Program, Stmt, Type,
} from "./ast.ts";
import type { Token, TokenWithPos } from "./lexer.ts";

export class ParseError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ParseError";
  }
}

const CMP_OPS = new Set(["==", "!=", "<", "<=", ">", ">="]);

class Parser {
  private pos = 0;
  constructor(private readonly toks: TokenWithPos[]) {}

  private peek(): Token { return this.toks[this.pos]!.token; }
  private lineOf(): number { return this.toks[this.pos]!.line; }

  private advance(): Token {
    const t = this.toks[this.pos]!.token;
    if (t.kind !== "TEof") this.pos++;
    return t;
  }

  private isPunct(t: Token, s: string): boolean {
    return t.kind === "TPunct" && t.sym === s;
  }
  private isOp(t: Token, s: string): boolean {
    return t.kind === "TOp" && t.op === s;
  }
  private isKw(t: Token, s: string): boolean {
    return t.kind === "TKw" && t.name === s;
  }

  private expectPunct(s: string): void {
    const t = this.peek();
    if (this.isPunct(t, s)) { this.advance(); return; }
    throw new ParseError(`expected '${s}' but got ${JSON.stringify(t)} at line ${this.lineOf()}`);
  }
  private expectOp(s: string): void {
    const t = this.peek();
    if (this.isOp(t, s)) { this.advance(); return; }
    throw new ParseError(`expected '${s}' but got ${JSON.stringify(t)} at line ${this.lineOf()}`);
  }
  private expectKw(s: string): void {
    const t = this.peek();
    if (this.isKw(t, s)) { this.advance(); return; }
    throw new ParseError(`expected keyword '${s}' but got ${JSON.stringify(t)} at line ${this.lineOf()}`);
  }
  private expectIdent(): string {
    const t = this.peek();
    if (t.kind === "TIdent") { this.advance(); return t.name; }
    throw new ParseError(`expected identifier but got ${JSON.stringify(t)} at line ${this.lineOf()}`);
  }

  parseProgram(): Program {
    const funcs: FunDef[] = [];
    const stmts: Stmt[] = [];
    while (this.peek().kind !== "TEof") {
      if (this.isKw(this.peek(), "function")) {
        funcs.push(this.parseFunction());
      } else {
        stmts.push(this.parseStatement());
      }
    }
    return { funcs, topStmts: stmts };
  }

  private parseFunction(): FunDef {
    this.expectKw("function");
    const name = this.expectIdent();
    this.expectPunct("(");
    const params: Param[] = [];
    if (!this.isPunct(this.peek(), ")")) {
      params.push(this.parseParam());
      while (this.isPunct(this.peek(), ",")) {
        this.advance();
        params.push(this.parseParam());
      }
    }
    this.expectPunct(")");
    this.expectPunct(":");
    const retType = this.parseType();
    const body = this.parseBlock();
    return { name, params, retType, body };
  }

  private parseParam(): Param {
    const name = this.expectIdent();
    this.expectPunct(":");
    const ty = this.parseType();
    return { name, ty };
  }

  private parseType(): Type {
    const t = this.peek();
    if (this.isKw(t, "int"))    { this.advance(); return { kind: "TInt" }; }
    if (this.isKw(t, "string")) { this.advance(); return { kind: "TString" }; }
    if (this.isKw(t, "list")) {
      this.advance();
      this.expectOp("<");
      const elem = this.parseType();
      this.expectOp(">");
      return { kind: "TList", elem };
    }
    throw new ParseError(`expected type but got ${JSON.stringify(t)} at line ${this.lineOf()}`);
  }

  private parseBlock(): Stmt[] {
    this.expectPunct("{");
    const stmts: Stmt[] = [];
    while (!this.isPunct(this.peek(), "}")) {
      stmts.push(this.parseStatement());
    }
    this.expectPunct("}");
    return stmts;
  }

  private parseStatement(): Stmt {
    const t = this.peek();
    if (this.isKw(t, "val"))    return this.parseValDef();
    if (this.isKw(t, "var"))    return this.parseVarDef();
    if (this.isKw(t, "if"))     return this.parseIf();
    if (this.isKw(t, "while"))  return this.parseWhile();
    if (this.isKw(t, "print"))  return this.parsePrint();
    if (this.isKw(t, "return")) return this.parseReturn();
    if (t.kind === "TIdent") {
      const next = this.toks[this.pos + 1]?.token;
      if (next && this.isOp(next, "=")) return this.parseReassign();
    }
    return this.parseExprStmt();
  }

  private parseValDef(): Stmt {
    this.expectKw("val");
    const name = this.expectIdent();
    let declared: Type | null = null;
    if (this.isPunct(this.peek(), ":")) {
      this.advance();
      declared = this.parseType();
    }
    this.expectOp("=");
    const init = this.parseExpr();
    this.expectPunct(";");
    return { kind: "ValDef", name, declared, init };
  }

  private parseVarDef(): Stmt {
    this.expectKw("var");
    const name = this.expectIdent();
    let declared: Type | null = null;
    if (this.isPunct(this.peek(), ":")) {
      this.advance();
      declared = this.parseType();
    }
    this.expectOp("=");
    const init = this.parseExpr();
    this.expectPunct(";");
    return { kind: "VarDef", name, declared, init };
  }

  private parseReassign(): Stmt {
    const name = this.expectIdent();
    this.expectOp("=");
    const value = this.parseExpr();
    this.expectPunct(";");
    return { kind: "Reassign", name, value };
  }

  private parseIf(): Stmt {
    this.expectKw("if");
    this.expectPunct("(");
    const cond = this.parseExpr();
    this.expectPunct(")");
    const thenBlk = this.parseBlock();
    let elseBlk: Stmt[] = [];
    if (this.isKw(this.peek(), "else")) {
      this.advance();
      elseBlk = this.parseBlock();
    }
    return { kind: "If", cond, thenBlk, elseBlk };
  }

  private parseWhile(): Stmt {
    this.expectKw("while");
    this.expectPunct("(");
    const cond = this.parseExpr();
    this.expectPunct(")");
    const body = this.parseBlock();
    return { kind: "While", cond, body };
  }

  private parsePrint(): Stmt {
    this.expectKw("print");
    this.expectPunct("(");
    const value = this.parseExpr();
    this.expectPunct(")");
    this.expectPunct(";");
    return { kind: "Print", value };
  }

  private parseReturn(): Stmt {
    this.expectKw("return");
    const value = this.parseExpr();
    this.expectPunct(";");
    return { kind: "Return", value };
  }

  private parseExprStmt(): Stmt {
    const value = this.parseExpr();
    this.expectPunct(";");
    return { kind: "ExprStmt", value };
  }

  // === Expressions ===

  private parseExpr(): Expr { return this.parseComparison(); }

  private parseComparison(): Expr {
    let left = this.parseAdditive();
    while (true) {
      const t = this.peek();
      if (t.kind === "TOp" && CMP_OPS.has(t.op)) {
        const op = t.op;
        this.advance();
        const right = this.parseAdditive();
        left = { kind: "BinOp", op, left, right };
      } else break;
    }
    return left;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    while (true) {
      const t = this.peek();
      if (t.kind === "TOp" && (t.op === "+" || t.op === "-")) {
        const op = t.op;
        this.advance();
        const right = this.parseMultiplicative();
        left = { kind: "BinOp", op, left, right };
      } else break;
    }
    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t.kind === "TOp" && (t.op === "*" || t.op === "/" || t.op === "%")) {
        const op = t.op;
        this.advance();
        const right = this.parseUnary();
        left = { kind: "BinOp", op, left, right };
      } else break;
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.isOp(this.peek(), "-")) {
      this.advance();
      return { kind: "Neg", inner: this.parsePostfix() };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let e = this.parsePrimary();
    while (true) {
      const t = this.peek();
      if (this.isPunct(t, "(")) {
        if (e.kind === "Var") {
          const name = e.name;
          this.advance();
          const args: Expr[] = [];
          if (!this.isPunct(this.peek(), ")")) {
            args.push(this.parseExpr());
            while (this.isPunct(this.peek(), ",")) {
              this.advance();
              args.push(this.parseExpr());
            }
          }
          this.expectPunct(")");
          e = { kind: "Call", name, args };
        } else break;
      } else if (this.isPunct(t, "[")) {
        this.advance();
        const idx = this.parseExpr();
        this.expectPunct("]");
        e = { kind: "Index", arr: e, idx };
      } else break;
    }
    return e;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.kind === "TInt")   { this.advance(); return { kind: "IntLit", value: t.value }; }
    if (t.kind === "TStr")   { this.advance(); return { kind: "StrLit", value: t.value }; }
    if (t.kind === "TIdent") { this.advance(); return { kind: "Var", name: t.name }; }
    if (this.isPunct(t, "(")) {
      this.advance();
      const e = this.parseExpr();
      this.expectPunct(")");
      return e;
    }
    if (this.isPunct(t, "[")) {
      this.advance();
      const elems: Expr[] = [];
      if (!this.isPunct(this.peek(), "]")) {
        elems.push(this.parseExpr());
        while (this.isPunct(this.peek(), ",")) {
          this.advance();
          elems.push(this.parseExpr());
        }
      }
      this.expectPunct("]");
      return { kind: "ListLit", elems };
    }
    throw new ParseError(`unexpected token ${JSON.stringify(t)} at line ${this.lineOf()}`);
  }
}

export function parse(tokens: TokenWithPos[]): Program {
  return new Parser(tokens).parseProgram();
}
