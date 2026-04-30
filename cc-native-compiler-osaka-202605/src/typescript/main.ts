// nb-lang compiler — TypeScript reference implementation (Phase 1)
// 実行: bun run main.ts <source.nb>

import * as fs from "node:fs";

// ===== AST =====

type Expr =
  | { kind: "IntLit"; value: number }
  | { kind: "Var"; name: string }
  | { kind: "BinOp"; op: string; left: Expr; right: Expr };

type Stmt =
  | { kind: "ValDef"; name: string; init: Expr }
  | { kind: "VarDef"; name: string; init: Expr }
  | { kind: "Reassign"; name: string; value: Expr }
  | { kind: "If"; cond: Expr; thenBlk: Stmt[]; elseBlk: Stmt[] }
  | { kind: "While"; cond: Expr; body: Stmt[] }
  | { kind: "Print"; value: Expr };

// ===== Lexer =====

type Token =
  | { kind: "Int"; value: number }
  | { kind: "Ident"; value: string }
  | { kind: "Kw"; value: "val" | "var" | "if" | "else" | "while" | "print" }
  | { kind: "Op"; value: string }
  | { kind: "LParen" }
  | { kind: "RParen" }
  | { kind: "LBrace" }
  | { kind: "RBrace" }
  | { kind: "Semi" }
  | { kind: "EOF" };

const KEYWORDS = new Set(["val", "var", "if", "else", "while", "print"]);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (/\d/.test(c)) {
      let j = i;
      while (j < n && /\d/.test(src[j])) j++;
      tokens.push({ kind: "Int", value: parseInt(src.substring(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_]/.test(src[j])) j++;
      const word = src.substring(i, j);
      if (KEYWORDS.has(word)) {
        tokens.push({ kind: "Kw", value: word as "val" | "var" | "if" | "else" | "while" | "print" });
      } else {
        tokens.push({ kind: "Ident", value: word });
      }
      i = j;
      continue;
    }
    if (c === "(") { tokens.push({ kind: "LParen" }); i++; continue; }
    if (c === ")") { tokens.push({ kind: "RParen" }); i++; continue; }
    if (c === "{") { tokens.push({ kind: "LBrace" }); i++; continue; }
    if (c === "}") { tokens.push({ kind: "RBrace" }); i++; continue; }
    if (c === ";") { tokens.push({ kind: "Semi" }); i++; continue; }
    if (c === "=" && src[i + 1] === "=") { tokens.push({ kind: "Op", value: "==" }); i += 2; continue; }
    if (c === "!" && src[i + 1] === "=") { tokens.push({ kind: "Op", value: "!=" }); i += 2; continue; }
    if (c === "<" && src[i + 1] === "=") { tokens.push({ kind: "Op", value: "<=" }); i += 2; continue; }
    if (c === ">" && src[i + 1] === "=") { tokens.push({ kind: "Op", value: ">=" }); i += 2; continue; }
    if ("+-*/%<>=".includes(c)) { tokens.push({ kind: "Op", value: c }); i++; continue; }
    throw new Error(`Unknown char: '${c}' at position ${i}`);
  }
  tokens.push({ kind: "EOF" });
  return tokens;
}

// ===== Parser =====

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  parseProgram(): Stmt[] {
    const stmts: Stmt[] = [];
    while (this.peek().kind !== "EOF") {
      stmts.push(this.parseStmt());
    }
    return stmts;
  }

  private parseStmt(): Stmt {
    const t = this.peek();
    if (t.kind === "Kw") {
      switch (t.value) {
        case "val":   return this.parseValDef();
        case "var":   return this.parseVarDef();
        case "if":    return this.parseIf();
        case "while": return this.parseWhile();
        case "print": return this.parsePrint();
      }
    }
    if (t.kind === "Ident") return this.parseReassign();
    throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
  }

  private parseValDef(): Stmt {
    this.consume(); // val
    const name = this.consumeIdent();
    this.expectOp("=");
    const init = this.parseExpr();
    this.expectSemi();
    return { kind: "ValDef", name, init };
  }

  private parseVarDef(): Stmt {
    this.consume(); // var
    const name = this.consumeIdent();
    this.expectOp("=");
    const init = this.parseExpr();
    this.expectSemi();
    return { kind: "VarDef", name, init };
  }

  private parseReassign(): Stmt {
    const name = this.consumeIdent();
    this.expectOp("=");
    const value = this.parseExpr();
    this.expectSemi();
    return { kind: "Reassign", name, value };
  }

  private parseIf(): Stmt {
    this.consume(); // if
    this.expectKind("LParen");
    const cond = this.parseExpr();
    this.expectKind("RParen");
    const thenBlk = this.parseBlock();
    let elseBlk: Stmt[] = [];
    const next = this.peek();
    if (next.kind === "Kw" && next.value === "else") {
      this.consume();
      elseBlk = this.parseBlock();
    }
    return { kind: "If", cond, thenBlk, elseBlk };
  }

  private parseWhile(): Stmt {
    this.consume(); // while
    this.expectKind("LParen");
    const cond = this.parseExpr();
    this.expectKind("RParen");
    const body = this.parseBlock();
    return { kind: "While", cond, body };
  }

  private parsePrint(): Stmt {
    this.consume(); // print
    this.expectKind("LParen");
    const value = this.parseExpr();
    this.expectKind("RParen");
    this.expectSemi();
    return { kind: "Print", value };
  }

  private parseBlock(): Stmt[] {
    this.expectKind("LBrace");
    const stmts: Stmt[] = [];
    while (this.peek().kind !== "RBrace") {
      stmts.push(this.parseStmt());
    }
    this.consume(); // }
    return stmts;
  }

  private parseExpr(): Expr { return this.parseComparison(); }

  private parseComparison(): Expr {
    let left = this.parseAdditive();
    while (this.isOp(["==", "!=", "<", "<=", ">", ">="])) {
      const op = (this.consume() as { kind: "Op"; value: string }).value;
      const right = this.parseAdditive();
      left = { kind: "BinOp", op, left, right };
    }
    return left;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    while (this.isOp(["+", "-"])) {
      const op = (this.consume() as { kind: "Op"; value: string }).value;
      const right = this.parseMultiplicative();
      left = { kind: "BinOp", op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parsePrimary();
    while (this.isOp(["*", "/", "%"])) {
      const op = (this.consume() as { kind: "Op"; value: string }).value;
      const right = this.parsePrimary();
      left = { kind: "BinOp", op, left, right };
    }
    return left;
  }

  private parsePrimary(): Expr {
    const t = this.consume();
    if (t.kind === "Int") return { kind: "IntLit", value: t.value };
    if (t.kind === "Ident") return { kind: "Var", name: t.value };
    if (t.kind === "LParen") {
      const e = this.parseExpr();
      this.expectKind("RParen");
      return e;
    }
    throw new Error(`Expected primary, got ${JSON.stringify(t)}`);
  }

  private isOp(values: string[]): boolean {
    const t = this.peek();
    return t.kind === "Op" && values.includes(t.value);
  }

  private consumeIdent(): string {
    const t = this.consume();
    if (t.kind !== "Ident") throw new Error(`Expected identifier, got ${JSON.stringify(t)}`);
    return t.value;
  }

  private expectOp(value: string): void {
    const t = this.consume();
    if (t.kind !== "Op" || t.value !== value) {
      throw new Error(`Expected '${value}', got ${JSON.stringify(t)}`);
    }
  }

  private expectKind(kind: Token["kind"]): void {
    const t = this.consume();
    if (t.kind !== kind) throw new Error(`Expected ${kind}, got ${JSON.stringify(t)}`);
  }

  private expectSemi(): void { this.expectKind("Semi"); }
}

// ===== CodeGen =====

class CodeGen {
  private lines: string[] = [];
  private tempCounter = 0;
  private labelCounter = 0;

  private fresh(): string {
    this.tempCounter++;
    return `%t${this.tempCounter}`;
  }

  private freshLabel(prefix: string): string {
    this.labelCounter++;
    return `${prefix}${this.labelCounter}`;
  }

  private emit(line: string): void { this.lines.push(line); }

  private detectTriple(): string {
    return process.platform === "darwin"
      ? "arm64-apple-macosx15.0.0"
      : "x86_64-pc-linux-gnu";
  }

  gen(program: Stmt[]): string {
    this.emit("; ModuleID = 'nb-lang'");
    this.emit(`target triple = "${this.detectTriple()}"`);
    this.emit("");
    this.emit('@fmt = private constant [5 x i8] c"%ld\\0A\\00"');
    this.emit("declare i32 @printf(ptr, ...)");
    this.emit("");
    this.emit("define i32 @main() {");
    this.emit("entry:");
    for (const s of program) this.genStmt(s);
    this.emit("  ret i32 0");
    this.emit("}");
    return this.lines.join("\n") + "\n";
  }

  private genStmt(s: Stmt): void {
    switch (s.kind) {
      case "ValDef":
      case "VarDef": {
        this.emit(`  %${s.name} = alloca i64, align 8`);
        const v = this.genExpr(s.init);
        this.emit(`  store i64 ${v}, ptr %${s.name}`);
        break;
      }
      case "Reassign": {
        const v = this.genExpr(s.value);
        this.emit(`  store i64 ${v}, ptr %${s.name}`);
        break;
      }
      case "Print": {
        const v = this.genExpr(s.value);
        this.emit(`  call i32 (ptr, ...) @printf(ptr @fmt, i64 ${v})`);
        break;
      }
      case "If": {
        const c = this.genExpr(s.cond);
        const ci1 = this.fresh();
        this.emit(`  ${ci1} = icmp ne i64 ${c}, 0`);
        const thenL = this.freshLabel("then");
        const elseL = this.freshLabel("else");
        const endL  = this.freshLabel("ifend");
        this.emit(`  br i1 ${ci1}, label %${thenL}, label %${elseL}`);
        this.emit(`${thenL}:`);
        for (const st of s.thenBlk) this.genStmt(st);
        this.emit(`  br label %${endL}`);
        this.emit(`${elseL}:`);
        for (const st of s.elseBlk) this.genStmt(st);
        this.emit(`  br label %${endL}`);
        this.emit(`${endL}:`);
        break;
      }
      case "While": {
        const condL = this.freshLabel("cond");
        const bodyL = this.freshLabel("body");
        const exitL = this.freshLabel("exit");
        this.emit(`  br label %${condL}`);
        this.emit(`${condL}:`);
        const c = this.genExpr(s.cond);
        const ci1 = this.fresh();
        this.emit(`  ${ci1} = icmp ne i64 ${c}, 0`);
        this.emit(`  br i1 ${ci1}, label %${bodyL}, label %${exitL}`);
        this.emit(`${bodyL}:`);
        for (const st of s.body) this.genStmt(st);
        this.emit(`  br label %${condL}`);
        this.emit(`${exitL}:`);
        break;
      }
    }
  }

  private genExpr(e: Expr): string {
    switch (e.kind) {
      case "IntLit": return e.value.toString();
      case "Var": {
        const r = this.fresh();
        this.emit(`  ${r} = load i64, ptr %${e.name}`);
        return r;
      }
      case "BinOp": {
        const lv = this.genExpr(e.left);
        const rv = this.genExpr(e.right);
        const res = this.fresh();
        const arith: Record<string, string> = {
          "+": "add", "-": "sub", "*": "mul", "/": "sdiv", "%": "srem"
        };
        const cmp: Record<string, string> = {
          "==": "eq", "!=": "ne", "<": "slt", "<=": "sle", ">": "sgt", ">=": "sge"
        };
        if (arith[e.op]) {
          this.emit(`  ${res} = ${arith[e.op]} i64 ${lv}, ${rv}`);
        } else if (cmp[e.op]) {
          const tmp = this.fresh();
          this.emit(`  ${tmp} = icmp ${cmp[e.op]} i64 ${lv}, ${rv}`);
          this.emit(`  ${res} = zext i1 ${tmp} to i64`);
        } else {
          throw new Error(`Unknown op: ${e.op}`);
        }
        return res;
      }
    }
  }
}

// ===== Main =====

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: bun run main.ts <source.nb>");
  process.exit(1);
}

const src = fs.readFileSync(args[0], "utf-8");
const tokens = tokenize(src);
const parser = new Parser(tokens);
const program = parser.parseProgram();
const codegen = new CodeGen();
const ir = codegen.gen(program);
process.stdout.write(ir);
