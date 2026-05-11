package nblang;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import nblang.Ast.Expr;
import nblang.Ast.FunDef;
import nblang.Ast.Param;
import nblang.Ast.Program;
import nblang.Ast.Stmt;
import nblang.Ast.Type;

public final class TypeCheck {
    public static final class TypeError extends RuntimeException {
        public TypeError(String msg) { super(msg); }
    }

    private record VarInfo(Type ty, boolean isMutable) {}
    private record FunSig(List<Type> params, Type retType) {}

    private TypeCheck() {}

    public static void check(Program program) {
        Map<String, FunSig> funcs = new HashMap<>();
        for (FunDef f : program.funcs()) {
            List<Type> paramTypes = f.params().stream().map(Param::ty).toList();
            funcs.put(f.name(), new FunSig(paramTypes, f.retType()));
        }

        for (FunDef f : program.funcs()) {
            Map<String, VarInfo> env = new HashMap<>();
            for (Param p : f.params()) {
                env.put(p.name(), new VarInfo(p.ty(), false));
            }
            checkStmts(f.body(), env, funcs, f.retType());
        }

        checkStmts(program.topStmts(), new HashMap<>(), funcs, null);
    }

    private static Map<String, VarInfo> checkStmts(
            List<Stmt> stmts,
            Map<String, VarInfo> envIn,
            Map<String, FunSig> funcs,
            Type retTy) {
        Map<String, VarInfo> env = new HashMap<>(envIn);
        for (Stmt s : stmts) {
            env = checkStmt(s, env, funcs, retTy);
        }
        return env;
    }

    private static Map<String, VarInfo> checkStmt(
            Stmt stmt,
            Map<String, VarInfo> env,
            Map<String, FunSig> funcs,
            Type retTy) {
        return switch (stmt) {
            case Stmt.ValDef v -> {
                Type initTy = checkExpr(v.init(), env, funcs);
                Type finalTy = v.declared();
                if (finalTy == null) {
                    finalTy = initTy;
                } else if (!sameType(finalTy, initTy)) {
                    throw new TypeError("val " + v.name() + ": declared " + finalTy + " but init is " + initTy);
                }
                Map<String, VarInfo> next = new HashMap<>(env);
                next.put(v.name(), new VarInfo(finalTy, false));
                yield next;
            }
            case Stmt.VarDef v -> {
                Type initTy = checkExpr(v.init(), env, funcs);
                Type finalTy = v.declared();
                if (finalTy == null) {
                    finalTy = initTy;
                } else if (!sameType(finalTy, initTy)) {
                    throw new TypeError("var " + v.name() + ": declared " + finalTy + " but init is " + initTy);
                }
                Map<String, VarInfo> next = new HashMap<>(env);
                next.put(v.name(), new VarInfo(finalTy, true));
                yield next;
            }
            case Stmt.Reassign r -> {
                VarInfo info = env.get(r.name());
                if (info == null) throw new TypeError("undefined variable: " + r.name());
                if (!info.isMutable()) throw new TypeError("cannot reassign val: " + r.name());
                Type vt = checkExpr(r.value(), env, funcs);
                if (!sameType(info.ty(), vt)) {
                    throw new TypeError(r.name() + ": type " + info.ty() + " but got " + vt);
                }
                yield env;
            }
            case Stmt.IfS i -> {
                Type ct = checkExpr(i.cond(), env, funcs);
                if (!(ct instanceof Type.TInt)) {
                    throw new TypeError("if condition must be int (bool), got " + ct);
                }
                checkStmts(i.thenBlk(), env, funcs, retTy);
                checkStmts(i.elseBlk(), env, funcs, retTy);
                yield env;
            }
            case Stmt.WhileS w -> {
                Type ct = checkExpr(w.cond(), env, funcs);
                if (!(ct instanceof Type.TInt)) {
                    throw new TypeError("while condition must be int (bool), got " + ct);
                }
                checkStmts(w.body(), env, funcs, retTy);
                yield env;
            }
            case Stmt.Print p -> {
                checkExpr(p.value(), env, funcs);
                yield env;
            }
            case Stmt.Return r -> {
                Type vt = checkExpr(r.value(), env, funcs);
                if (retTy == null) throw new TypeError("return outside function");
                if (!sameType(retTy, vt)) {
                    throw new TypeError("return type mismatch: expected " + retTy + ", got " + vt);
                }
                yield env;
            }
            case Stmt.ExprStmt es -> {
                checkExpr(es.value(), env, funcs);
                yield env;
            }
        };
    }

    private static Type checkExpr(Expr e, Map<String, VarInfo> env, Map<String, FunSig> funcs) {
        return switch (e) {
            case Expr.IntLit ignored -> new Type.TInt();
            case Expr.StrLit ignored -> new Type.TString();
            case Expr.Var v -> {
                VarInfo info = env.get(v.name());
                if (info == null) throw new TypeError("undefined variable: " + v.name());
                yield info.ty();
            }
            case Expr.Neg neg -> {
                Type t = checkExpr(neg.inner(), env, funcs);
                if (!(t instanceof Type.TInt)) throw new TypeError("negation requires int, got " + t);
                yield new Type.TInt();
            }
            case Expr.BinOp b -> {
                Type lt = checkExpr(b.left(), env, funcs);
                Type rt = checkExpr(b.right(), env, funcs);
                if (!sameType(lt, rt)) {
                    throw new TypeError("binop " + b.op() + ": type mismatch " + lt + " vs " + rt);
                }
                yield switch (b.op()) {
                    case "+", "-", "*", "/", "%" -> {
                        if (!(lt instanceof Type.TInt)) {
                            throw new TypeError("arithmetic " + b.op() + " requires int, got " + lt);
                        }
                        yield new Type.TInt();
                    }
                    case "==", "!=", "<", "<=", ">", ">=" -> {
                        if (!(lt instanceof Type.TInt)) {
                            throw new TypeError("comparison " + b.op() + " requires int, got " + lt);
                        }
                        yield new Type.TInt();
                    }
                    default -> throw new TypeError("unknown op: " + b.op());
                };
            }
            case Expr.Call c -> {
                FunSig sig = funcs.get(c.name());
                if (sig == null) throw new TypeError("undefined function: " + c.name());
                if (c.args().size() != sig.params().size()) {
                    throw new TypeError(c.name() + ": expected " + sig.params().size()
                            + " args, got " + c.args().size());
                }
                for (int i = 0; i < c.args().size(); i++) {
                    Type at = checkExpr(c.args().get(i), env, funcs);
                    Type pt = sig.params().get(i);
                    if (!sameType(at, pt)) {
                        throw new TypeError(c.name() + ": arg type " + at + ", expected " + pt);
                    }
                }
                yield sig.retType();
            }
            case Expr.Index idx -> {
                Type at = checkExpr(idx.arr(), env, funcs);
                Type it = checkExpr(idx.idx(), env, funcs);
                if (!(it instanceof Type.TInt)) throw new TypeError("index must be int, got " + it);
                if (at instanceof Type.TList tl) yield tl.elem();
                throw new TypeError("cannot index non-list type: " + at);
            }
            case Expr.ListLit ll -> {
                if (ll.elems().isEmpty()) throw new TypeError("empty list literal is not supported");
                Type first = checkExpr(ll.elems().get(0), env, funcs);
                for (int i = 1; i < ll.elems().size(); i++) {
                    Type t = checkExpr(ll.elems().get(i), env, funcs);
                    if (!sameType(t, first)) {
                        throw new TypeError("list literal: mixed types " + first + " and " + t);
                    }
                }
                yield new Type.TList(first);
            }
        };
    }

    private static boolean sameType(Type a, Type b) {
        if (a instanceof Type.TInt && b instanceof Type.TInt) return true;
        if (a instanceof Type.TString && b instanceof Type.TString) return true;
        if (a instanceof Type.TList la && b instanceof Type.TList lb) {
            return sameType(la.elem(), lb.elem());
        }
        return false;
    }
}
