import type {
  Expr, FunDef, Param, Program, Stmt, Type,
} from "./ast.ts";

type FunSig    = { params: Param[]; retType: Type };
type VarSlot   = { ptr: string; ty: Type };
type StmtRes   = { terminated: boolean };
type ExprRes   = { value: string; ty: Type };

class CodeGen {
  private globalDecls: string[] = [];
  private funcDefs:    string[] = [];
  private mainBuf:     string[] = [];

  private regCounter    = 0;
  private labelCounter  = 0;
  private strCounter    = 0;
  private suffixCounter = 0;

  private funcs = new Map<string, FunSig>();
  private strPool = new Map<string, string>();

  generate(program: Program): string {
    for (const f of program.funcs) {
      this.funcs.set(f.name, { params: f.params, retType: f.retType });
    }
    for (const f of program.funcs) this.genFunction(f);
    this.genMain(program.topStmts);
    return this.result();
  }

  // === helpers ===

  private freshReg(prefix: string): string {
    this.regCounter++;
    return `%${prefix}.${this.regCounter}`;
  }
  private freshLabel(prefix: string): string {
    this.labelCounter++;
    return `${prefix}.${this.labelCounter}`;
  }
  private freshSuffix(): string {
    this.suffixCounter++;
    return String(this.suffixCounter);
  }

  private llvmType(t: Type): string {
    switch (t.kind) {
      case "TInt":    return "i64";
      case "TString": return "ptr";
      case "TList":   return "ptr";
    }
  }

  private defaultRet(t: Type): string {
    switch (t.kind) {
      case "TInt":    return "ret i64 0";
      case "TString": return "ret ptr null";
      case "TList":   return "ret ptr null";
    }
  }

  // === 文字列リテラル ===

  private addString(s: string): string {
    const existing = this.strPool.get(s);
    if (existing !== undefined) return existing;
    this.strCounter++;
    const name = `@.str.${this.strCounter}`;
    const enc = encodeBytes(s);
    const totalLen = enc.byteLen + 1;
    this.globalDecls.push(
      `${name} = private constant [${totalLen} x i8] c"${enc.escaped}\\00"`,
    );
    this.strPool.set(s, name);
    return name;
  }

  // === エントリ ===

  private genMain(stmts: Stmt[]): void {
    this.regCounter = 0;
    this.labelCounter = 0;
    this.mainBuf.push("define i32 @main() {");
    this.mainBuf.push("entry:");
    const env = new Map<string, VarSlot>();
    const r = this.genStmts(stmts, env, this.mainBuf);
    if (!r.terminated) {
      this.mainBuf.push("  ret i32 0");
    }
    this.mainBuf.push("}");
    this.mainBuf.push("");
  }

  private genFunction(f: FunDef): void {
    this.regCounter = 0;
    this.labelCounter = 0;
    const paramStr = f.params
      .map((p) => `${this.llvmType(p.ty)} %arg.${p.name}`)
      .join(", ");
    this.funcDefs.push(`define ${this.llvmType(f.retType)} @${f.name}(${paramStr}) {`);
    this.funcDefs.push("entry:");
    const env = new Map<string, VarSlot>();
    for (const p of f.params) {
      const ptr = `%${p.name}.addr`;
      this.funcDefs.push(`  ${ptr} = alloca ${this.llvmType(p.ty)}`);
      this.funcDefs.push(`  store ${this.llvmType(p.ty)} %arg.${p.name}, ptr ${ptr}`);
      env.set(p.name, { ptr, ty: p.ty });
    }
    const r = this.genStmts(f.body, env, this.funcDefs);
    if (!r.terminated) {
      this.funcDefs.push(`  ${this.defaultRet(f.retType)}`);
    }
    this.funcDefs.push("}");
    this.funcDefs.push("");
  }

  // === 文の生成 ===

  private genStmts(stmts: Stmt[], env: Map<string, VarSlot>, buf: string[]): StmtRes {
    let terminated = false;
    for (const s of stmts) {
      if (terminated) break;
      terminated = this.genStmt(s, env, buf);
    }
    return { terminated };
  }

  private genStmt(s: Stmt, env: Map<string, VarSlot>, buf: string[]): boolean {
    switch (s.kind) {
      case "ValDef":
      case "VarDef": {
        const r = this.genExpr(s.init, env, buf);
        const ptr = `%${s.name}.addr.${this.freshSuffix()}`;
        buf.push(`  ${ptr} = alloca ${this.llvmType(r.ty)}`);
        buf.push(`  store ${this.llvmType(r.ty)} ${r.value}, ptr ${ptr}`);
        env.set(s.name, { ptr, ty: r.ty });
        return false;
      }
      case "Reassign": {
        const r = this.genExpr(s.value, env, buf);
        const slot = env.get(s.name)!;
        buf.push(`  store ${this.llvmType(slot.ty)} ${r.value}, ptr ${slot.ptr}`);
        return false;
      }
      case "If": {
        const c = this.genExpr(s.cond, env, buf);
        const condBool = this.freshReg("c");
        buf.push(`  ${condBool} = icmp ne i64 ${c.value}, 0`);
        const thenLbl = this.freshLabel("then");
        const elseLbl = this.freshLabel("else");
        const endLbl  = this.freshLabel("ifend");
        buf.push(`  br i1 ${condBool}, label %${thenLbl}, label %${elseLbl}`);

        buf.push(`${thenLbl}:`);
        const thenR = this.genStmts(s.thenBlk, new Map(env), buf);
        if (!thenR.terminated) buf.push(`  br label %${endLbl}`);

        buf.push(`${elseLbl}:`);
        const elseR = this.genStmts(s.elseBlk, new Map(env), buf);
        if (!elseR.terminated) buf.push(`  br label %${endLbl}`);

        if (thenR.terminated && elseR.terminated) {
          buf.push(`${endLbl}:`);
          buf.push("  unreachable");
          return true;
        }
        buf.push(`${endLbl}:`);
        return false;
      }
      case "While": {
        const condLbl = this.freshLabel("wcond");
        const bodyLbl = this.freshLabel("wbody");
        const endLbl  = this.freshLabel("wend");
        buf.push(`  br label %${condLbl}`);
        buf.push(`${condLbl}:`);
        const c = this.genExpr(s.cond, env, buf);
        const condBool = this.freshReg("c");
        buf.push(`  ${condBool} = icmp ne i64 ${c.value}, 0`);
        buf.push(`  br i1 ${condBool}, label %${bodyLbl}, label %${endLbl}`);
        buf.push(`${bodyLbl}:`);
        const bodyR = this.genStmts(s.body, new Map(env), buf);
        if (!bodyR.terminated) buf.push(`  br label %${condLbl}`);
        buf.push(`${endLbl}:`);
        return false;
      }
      case "Print": {
        const r = this.genExpr(s.value, env, buf);
        switch (r.ty.kind) {
          case "TInt":
            buf.push(`  call i32 (ptr, ...) @printf(ptr @.fmt.int, i64 ${r.value})`);
            break;
          case "TString":
            buf.push(`  call i32 (ptr, ...) @printf(ptr @.fmt.str, ptr ${r.value})`);
            break;
          case "TList": {
            const ph = this.addString("[list]");
            buf.push(`  call i32 (ptr, ...) @printf(ptr @.fmt.str, ptr ${ph})`);
            break;
          }
        }
        return false;
      }
      case "Return": {
        const r = this.genExpr(s.value, env, buf);
        buf.push(`  ret ${this.llvmType(r.ty)} ${r.value}`);
        return true;
      }
      case "ExprStmt":
        this.genExpr(s.value, env, buf);
        return false;
    }
  }

  // === 式の生成 ===

  private genExpr(e: Expr, env: Map<string, VarSlot>, buf: string[]): ExprRes {
    switch (e.kind) {
      case "IntLit":
        return { value: e.value.toString(), ty: { kind: "TInt" } };
      case "StrLit":
        return { value: this.addString(e.value), ty: { kind: "TString" } };
      case "Var": {
        const slot = env.get(e.name)!;
        const r = this.freshReg("v");
        buf.push(`  ${r} = load ${this.llvmType(slot.ty)}, ptr ${slot.ptr}`);
        return { value: r, ty: slot.ty };
      }
      case "Neg": {
        const inner = this.genExpr(e.inner, env, buf);
        const r = this.freshReg("neg");
        buf.push(`  ${r} = sub i64 0, ${inner.value}`);
        return { value: r, ty: { kind: "TInt" } };
      }
      case "BinOp": {
        const l = this.genExpr(e.left, env, buf);
        const r = this.genExpr(e.right, env, buf);
        switch (e.op) {
          case "+":  return this.emitArith("add",  l.value, r.value, buf);
          case "-":  return this.emitArith("sub",  l.value, r.value, buf);
          case "*":  return this.emitArith("mul",  l.value, r.value, buf);
          case "/":  return this.emitArith("sdiv", l.value, r.value, buf);
          case "%":  return this.emitArith("srem", l.value, r.value, buf);
          case "==": return this.emitCmp("eq",  l.value, r.value, buf);
          case "!=": return this.emitCmp("ne",  l.value, r.value, buf);
          case "<":  return this.emitCmp("slt", l.value, r.value, buf);
          case "<=": return this.emitCmp("sle", l.value, r.value, buf);
          case ">":  return this.emitCmp("sgt", l.value, r.value, buf);
          case ">=": return this.emitCmp("sge", l.value, r.value, buf);
          default:   throw new Error(`bad op ${e.op}`);
        }
      }
      case "Call": {
        const sig = this.funcs.get(e.name);
        if (!sig) throw new Error(`unknown function: ${e.name}`);
        const argParts: string[] = [];
        for (let i = 0; i < e.args.length; i++) {
          const av = this.genExpr(e.args[i]!, env, buf);
          const pty = sig.params[i]!.ty;
          argParts.push(`${this.llvmType(pty)} ${av.value}`);
        }
        const r = this.freshReg("call");
        buf.push(`  ${r} = call ${this.llvmType(sig.retType)} @${e.name}(${argParts.join(", ")})`);
        return { value: r, ty: sig.retType };
      }
      case "Index": {
        const arr = this.genExpr(e.arr, env, buf);
        const idx = this.genExpr(e.idx, env, buf);
        if (arr.ty.kind !== "TList") throw new Error(`cannot index non-list`);
        const elemTy = arr.ty.elem;
        const ep = this.freshReg("ep");
        buf.push(`  ${ep} = getelementptr ${this.llvmType(elemTy)}, ptr ${arr.value}, i64 ${idx.value}`);
        const r = this.freshReg("elem");
        buf.push(`  ${r} = load ${this.llvmType(elemTy)}, ptr ${ep}`);
        return { value: r, ty: elemTy };
      }
      case "ListLit": {
        if (e.elems.length === 0) throw new Error("empty list not supported");
        const first = this.genExpr(e.elems[0]!, env, buf);
        const elemTy = first.ty;
        const byteSize = e.elems.length * 8;
        const basePtr = this.freshReg("list");
        buf.push(`  ${basePtr} = call ptr @malloc(i64 ${byteSize})`);
        const ep0 = this.freshReg("ep");
        buf.push(`  ${ep0} = getelementptr ${this.llvmType(elemTy)}, ptr ${basePtr}, i64 0`);
        buf.push(`  store ${this.llvmType(elemTy)} ${first.value}, ptr ${ep0}`);
        for (let i = 1; i < e.elems.length; i++) {
          const v = this.genExpr(e.elems[i]!, env, buf);
          const ep = this.freshReg("ep");
          buf.push(`  ${ep} = getelementptr ${this.llvmType(elemTy)}, ptr ${basePtr}, i64 ${i}`);
          buf.push(`  store ${this.llvmType(elemTy)} ${v.value}, ptr ${ep}`);
        }
        return { value: basePtr, ty: { kind: "TList", elem: elemTy } };
      }
    }
  }

  private emitArith(op: string, lv: string, rv: string, buf: string[]): ExprRes {
    const out = this.freshReg("b");
    buf.push(`  ${out} = ${op} i64 ${lv}, ${rv}`);
    return { value: out, ty: { kind: "TInt" } };
  }

  private emitCmp(pred: string, lv: string, rv: string, buf: string[]): ExprRes {
    const bool = this.freshReg("cmp");
    buf.push(`  ${bool} = icmp ${pred} i64 ${lv}, ${rv}`);
    const ext = this.freshReg("ext");
    buf.push(`  ${ext} = zext i1 ${bool} to i64`);
    return { value: ext, ty: { kind: "TInt" } };
  }

  // === 最終結合 ===

  private result(): string {
    const out: string[] = [];
    out.push("; ModuleID = 'nb-lang'");
    out.push(`target triple = "${targetTriple()}"`);
    out.push("");
    out.push(`@.fmt.int = private constant [5 x i8] c"%ld\\0A\\00"`);
    out.push(`@.fmt.str = private constant [4 x i8] c"%s\\0A\\00"`);
    out.push("declare i32 @printf(ptr, ...)");
    out.push("declare ptr @malloc(i64)");
    out.push("");
    out.push(...this.globalDecls);
    out.push("");
    out.push(...this.funcDefs);
    out.push(...this.mainBuf);
    return out.join("\n");
  }
}

function targetTriple(): string {
  return process.platform === "darwin"
    ? "arm64-apple-macosx15.0.0"
    : "x86_64-pc-linux-gnu";
}

function encodeBytes(s: string): { escaped: string; byteLen: number } {
  const utf8 = new TextEncoder().encode(s);
  let escaped = "";
  for (const b of utf8) {
    const c = b & 0xff;
    if (c >= 0x20 && c <= 0x7e && c !== 0x22 /* " */ && c !== 0x5c /* \ */) {
      escaped += String.fromCharCode(c);
    } else {
      escaped += "\\" + c.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return { escaped, byteLen: utf8.length };
}

export function generate(program: Program): string {
  return new CodeGen().generate(program);
}
