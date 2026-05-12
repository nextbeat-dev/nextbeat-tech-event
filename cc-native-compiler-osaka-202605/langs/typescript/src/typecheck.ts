import type {
  Expr, FunDef, Program, Stmt, Type,
} from "./ast.ts";
import { typeToString } from "./ast.ts";

export class TypeError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "TypeError";
  }
}

type VarInfo = { ty: Type; isMutable: boolean };
type FunSig  = { params: Type[]; retType: Type };

export function check(program: Program): void {
  const funcs = new Map<string, FunSig>();
  for (const f of program.funcs) {
    funcs.set(f.name, { params: f.params.map((p) => p.ty), retType: f.retType });
  }

  for (const f of program.funcs) {
    const env = new Map<string, VarInfo>();
    for (const p of f.params) {
      env.set(p.name, { ty: p.ty, isMutable: false });
    }
    checkStmts(f.body, env, funcs, f.retType);
  }

  checkStmts(program.topStmts, new Map(), funcs, null);
}

function checkStmts(
  stmts: Stmt[],
  envIn: Map<string, VarInfo>,
  funcs: Map<string, FunSig>,
  retTy: Type | null,
): Map<string, VarInfo> {
  let env = new Map(envIn);
  for (const s of stmts) {
    env = checkStmt(s, env, funcs, retTy);
  }
  return env;
}

function checkStmt(
  stmt: Stmt,
  env: Map<string, VarInfo>,
  funcs: Map<string, FunSig>,
  retTy: Type | null,
): Map<string, VarInfo> {
  switch (stmt.kind) {
    case "ValDef": {
      const initTy = checkExpr(stmt.init, env, funcs);
      let finalTy = stmt.declared;
      if (finalTy === null) {
        finalTy = initTy;
      } else if (!sameType(finalTy, initTy)) {
        throw new TypeError(
          `val ${stmt.name}: declared ${typeToString(finalTy)} but init is ${typeToString(initTy)}`,
        );
      }
      const next = new Map(env);
      next.set(stmt.name, { ty: finalTy, isMutable: false });
      return next;
    }
    case "VarDef": {
      const initTy = checkExpr(stmt.init, env, funcs);
      let finalTy = stmt.declared;
      if (finalTy === null) {
        finalTy = initTy;
      } else if (!sameType(finalTy, initTy)) {
        throw new TypeError(
          `var ${stmt.name}: declared ${typeToString(finalTy)} but init is ${typeToString(initTy)}`,
        );
      }
      const next = new Map(env);
      next.set(stmt.name, { ty: finalTy, isMutable: true });
      return next;
    }
    case "Reassign": {
      const info = env.get(stmt.name);
      if (!info) throw new TypeError(`undefined variable: ${stmt.name}`);
      if (!info.isMutable) throw new TypeError(`cannot reassign val: ${stmt.name}`);
      const vt = checkExpr(stmt.value, env, funcs);
      if (!sameType(info.ty, vt)) {
        throw new TypeError(
          `${stmt.name}: type ${typeToString(info.ty)} but got ${typeToString(vt)}`,
        );
      }
      return env;
    }
    case "If": {
      const ct = checkExpr(stmt.cond, env, funcs);
      if (ct.kind !== "TInt") {
        throw new TypeError(`if condition must be int (bool), got ${typeToString(ct)}`);
      }
      checkStmts(stmt.thenBlk, env, funcs, retTy);
      checkStmts(stmt.elseBlk, env, funcs, retTy);
      return env;
    }
    case "While": {
      const ct = checkExpr(stmt.cond, env, funcs);
      if (ct.kind !== "TInt") {
        throw new TypeError(`while condition must be int (bool), got ${typeToString(ct)}`);
      }
      checkStmts(stmt.body, env, funcs, retTy);
      return env;
    }
    case "Print":
      checkExpr(stmt.value, env, funcs);
      return env;
    case "Return": {
      const vt = checkExpr(stmt.value, env, funcs);
      if (retTy === null) throw new TypeError("return outside function");
      if (!sameType(retTy, vt)) {
        throw new TypeError(
          `return type mismatch: expected ${typeToString(retTy)}, got ${typeToString(vt)}`,
        );
      }
      return env;
    }
    case "ExprStmt":
      checkExpr(stmt.value, env, funcs);
      return env;
  }
}

function checkExpr(
  e: Expr,
  env: Map<string, VarInfo>,
  funcs: Map<string, FunSig>,
): Type {
  switch (e.kind) {
    case "IntLit": return { kind: "TInt" };
    case "StrLit": return { kind: "TString" };
    case "Var": {
      const info = env.get(e.name);
      if (!info) throw new TypeError(`undefined variable: ${e.name}`);
      return info.ty;
    }
    case "Neg": {
      const t = checkExpr(e.inner, env, funcs);
      if (t.kind !== "TInt") throw new TypeError(`negation requires int, got ${typeToString(t)}`);
      return { kind: "TInt" };
    }
    case "BinOp": {
      const lt = checkExpr(e.left, env, funcs);
      const rt = checkExpr(e.right, env, funcs);
      if (!sameType(lt, rt)) {
        throw new TypeError(`binop ${e.op}: type mismatch ${typeToString(lt)} vs ${typeToString(rt)}`);
      }
      switch (e.op) {
        case "+": case "-": case "*": case "/": case "%":
          if (lt.kind !== "TInt") {
            throw new TypeError(`arithmetic ${e.op} requires int, got ${typeToString(lt)}`);
          }
          return { kind: "TInt" };
        case "==": case "!=": case "<": case "<=": case ">": case ">=":
          if (lt.kind !== "TInt") {
            throw new TypeError(`comparison ${e.op} requires int, got ${typeToString(lt)}`);
          }
          return { kind: "TInt" };
        default:
          throw new TypeError(`unknown op: ${e.op}`);
      }
    }
    case "Call": {
      const sig = funcs.get(e.name);
      if (!sig) throw new TypeError(`undefined function: ${e.name}`);
      if (e.args.length !== sig.params.length) {
        throw new TypeError(
          `${e.name}: expected ${sig.params.length} args, got ${e.args.length}`,
        );
      }
      for (let i = 0; i < e.args.length; i++) {
        const at = checkExpr(e.args[i]!, env, funcs);
        const pt = sig.params[i]!;
        if (!sameType(at, pt)) {
          throw new TypeError(
            `${e.name}: arg type ${typeToString(at)}, expected ${typeToString(pt)}`,
          );
        }
      }
      return sig.retType;
    }
    case "Index": {
      const at = checkExpr(e.arr, env, funcs);
      const it = checkExpr(e.idx, env, funcs);
      if (it.kind !== "TInt") throw new TypeError(`index must be int, got ${typeToString(it)}`);
      if (at.kind === "TList") return at.elem;
      throw new TypeError(`cannot index non-list type: ${typeToString(at)}`);
    }
    case "ListLit": {
      if (e.elems.length === 0) throw new TypeError("empty list literal is not supported");
      const first = checkExpr(e.elems[0]!, env, funcs);
      for (let i = 1; i < e.elems.length; i++) {
        const t = checkExpr(e.elems[i]!, env, funcs);
        if (!sameType(t, first)) {
          throw new TypeError(
            `list literal: mixed types ${typeToString(first)} and ${typeToString(t)}`,
          );
        }
      }
      return { kind: "TList", elem: first };
    }
  }
}

function sameType(a: Type, b: Type): boolean {
  if (a.kind === "TInt"    && b.kind === "TInt")    return true;
  if (a.kind === "TString" && b.kind === "TString") return true;
  if (a.kind === "TList"   && b.kind === "TList")   return sameType(a.elem, b.elem);
  return false;
}
