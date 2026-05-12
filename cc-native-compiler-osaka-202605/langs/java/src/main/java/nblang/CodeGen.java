package nblang;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import nblang.Ast.Expr;
import nblang.Ast.FunDef;
import nblang.Ast.Param;
import nblang.Ast.Program;
import nblang.Ast.Stmt;
import nblang.Ast.Type;

public final class CodeGen {
    private record FunSig(List<Param> params, Type retType) {}
    private record VarSlot(String ptr, Type ty) {}
    private record EncodedBytes(String escaped, int byteLen) {}
    private record StmtResult(Map<String, VarSlot> env, boolean terminated) {}
    private record ExprResult(String value, Type ty) {}

    private final StringBuilder globalDecls = new StringBuilder();
    private final StringBuilder funcDefs    = new StringBuilder();
    private final StringBuilder mainBuf     = new StringBuilder();

    private int regCounter    = 0;
    private int labelCounter  = 0;
    private int strCounter    = 0;
    private int suffixCounter = 0;

    private Map<String, FunSig> funcs = Map.of();
    private final Map<String, String> strPool = new LinkedHashMap<>();

    private CodeGen() {}

    public static String generate(Program program) {
        CodeGen gen = new CodeGen();
        gen.gen(program);
        return gen.result();
    }

    // === helpers ===

    private String freshReg(String prefix) {
        regCounter++;
        return "%" + prefix + "." + regCounter;
    }

    private String freshLabel(String prefix) {
        labelCounter++;
        return prefix + "." + labelCounter;
    }

    private String freshSuffix() {
        suffixCounter++;
        return Integer.toString(suffixCounter);
    }

    private static String llvmType(Type t) {
        return switch (t) {
            case Type.TInt ignored    -> "i64";
            case Type.TString ignored -> "ptr";
            case Type.TList ignored   -> "ptr";
        };
    }

    private static String defaultRet(Type t) {
        return switch (t) {
            case Type.TInt ignored    -> "ret i64 0";
            case Type.TString ignored -> "ret ptr null";
            case Type.TList ignored   -> "ret ptr null";
        };
    }

    // === 文字列リテラル ===

    private String addString(String s) {
        String existing = strPool.get(s);
        if (existing != null) return existing;
        strCounter++;
        String name = "@.str." + strCounter;
        EncodedBytes enc = encodeBytes(s);
        int totalLen = enc.byteLen() + 1;
        globalDecls.append(name)
                .append(" = private constant [")
                .append(totalLen)
                .append(" x i8] c\"")
                .append(enc.escaped())
                .append("\\00\"\n");
        strPool.put(s, name);
        return name;
    }

    private static EncodedBytes encodeBytes(String s) {
        StringBuilder sb = new StringBuilder();
        byte[] utf8 = s.getBytes(StandardCharsets.UTF_8);
        for (byte b : utf8) {
            int c = b & 0xff;
            if (c >= 0x20 && c <= 0x7e && c != '"' && c != '\\') {
                sb.append((char) c);
            } else {
                sb.append(String.format("\\%02X", c));
            }
        }
        return new EncodedBytes(sb.toString(), utf8.length);
    }

    // === エントリ ===

    private void gen(Program program) {
        Map<String, FunSig> sigs = new HashMap<>();
        for (FunDef f : program.funcs()) {
            sigs.put(f.name(), new FunSig(f.params(), f.retType()));
        }
        funcs = sigs;

        for (FunDef f : program.funcs()) {
            genFunction(f);
        }
        genMain(program.topStmts());
    }

    private void genMain(List<Stmt> stmts) {
        regCounter = 0;
        labelCounter = 0;
        mainBuf.append("define i32 @main() {\n");
        mainBuf.append("entry:\n");
        Map<String, VarSlot> env = new HashMap<>();
        StmtResult r = genStmts(stmts, env, mainBuf);
        if (!r.terminated()) {
            mainBuf.append("  ret i32 0\n");
        }
        mainBuf.append("}\n\n");
    }

    private void genFunction(FunDef f) {
        regCounter = 0;
        labelCounter = 0;
        StringBuilder paramStr = new StringBuilder();
        for (int i = 0; i < f.params().size(); i++) {
            Param p = f.params().get(i);
            if (i > 0) paramStr.append(", ");
            paramStr.append(llvmType(p.ty())).append(" %arg.").append(p.name());
        }
        funcDefs.append("define ").append(llvmType(f.retType()))
                .append(" @").append(f.name())
                .append("(").append(paramStr).append(") {\n");
        funcDefs.append("entry:\n");
        Map<String, VarSlot> env = new HashMap<>();
        for (Param p : f.params()) {
            String ptr = "%" + p.name() + ".addr";
            funcDefs.append("  ").append(ptr)
                    .append(" = alloca ").append(llvmType(p.ty())).append("\n");
            funcDefs.append("  store ").append(llvmType(p.ty()))
                    .append(" %arg.").append(p.name())
                    .append(", ptr ").append(ptr).append("\n");
            env.put(p.name(), new VarSlot(ptr, p.ty()));
        }
        StmtResult r = genStmts(f.body(), env, funcDefs);
        if (!r.terminated()) {
            funcDefs.append("  ").append(defaultRet(f.retType())).append("\n");
        }
        funcDefs.append("}\n\n");
    }

    // === 文の生成 ===
    private StmtResult genStmts(List<Stmt> stmts, Map<String, VarSlot> env, StringBuilder buf) {
        boolean terminated = false;
        int idx = 0;
        while (idx < stmts.size() && !terminated) {
            terminated = genStmt(stmts.get(idx), env, buf);
            idx++;
        }
        return new StmtResult(env, terminated);
    }

    private boolean genStmt(Stmt s, Map<String, VarSlot> env, StringBuilder buf) {
        return switch (s) {
            case Stmt.ValDef v -> {
                ExprResult r = genExpr(v.init(), env, buf);
                String ptr = "%" + v.name() + ".addr." + freshSuffix();
                buf.append("  ").append(ptr).append(" = alloca ").append(llvmType(r.ty())).append("\n");
                buf.append("  store ").append(llvmType(r.ty()))
                        .append(" ").append(r.value())
                        .append(", ptr ").append(ptr).append("\n");
                env.put(v.name(), new VarSlot(ptr, r.ty()));
                yield false;
            }
            case Stmt.VarDef v -> {
                ExprResult r = genExpr(v.init(), env, buf);
                String ptr = "%" + v.name() + ".addr." + freshSuffix();
                buf.append("  ").append(ptr).append(" = alloca ").append(llvmType(r.ty())).append("\n");
                buf.append("  store ").append(llvmType(r.ty()))
                        .append(" ").append(r.value())
                        .append(", ptr ").append(ptr).append("\n");
                env.put(v.name(), new VarSlot(ptr, r.ty()));
                yield false;
            }
            case Stmt.Reassign re -> {
                ExprResult r = genExpr(re.value(), env, buf);
                VarSlot slot = env.get(re.name());
                buf.append("  store ").append(llvmType(slot.ty()))
                        .append(" ").append(r.value())
                        .append(", ptr ").append(slot.ptr()).append("\n");
                yield false;
            }
            case Stmt.IfS iff -> {
                ExprResult c = genExpr(iff.cond(), env, buf);
                String condBool = freshReg("c");
                buf.append("  ").append(condBool).append(" = icmp ne i64 ").append(c.value()).append(", 0\n");
                String thenLbl = freshLabel("then");
                String elseLbl = freshLabel("else");
                String endLbl  = freshLabel("ifend");
                buf.append("  br i1 ").append(condBool)
                        .append(", label %").append(thenLbl)
                        .append(", label %").append(elseLbl).append("\n");

                buf.append(thenLbl).append(":\n");
                StmtResult thenR = genStmts(iff.thenBlk(), new HashMap<>(env), buf);
                if (!thenR.terminated()) buf.append("  br label %").append(endLbl).append("\n");

                buf.append(elseLbl).append(":\n");
                StmtResult elseR = genStmts(iff.elseBlk(), new HashMap<>(env), buf);
                if (!elseR.terminated()) buf.append("  br label %").append(endLbl).append("\n");

                if (thenR.terminated() && elseR.terminated()) {
                    buf.append(endLbl).append(":\n");
                    buf.append("  unreachable\n");
                    yield true;
                } else {
                    buf.append(endLbl).append(":\n");
                    yield false;
                }
            }
            case Stmt.WhileS w -> {
                String condLbl = freshLabel("wcond");
                String bodyLbl = freshLabel("wbody");
                String endLbl  = freshLabel("wend");
                buf.append("  br label %").append(condLbl).append("\n");
                buf.append(condLbl).append(":\n");
                ExprResult c = genExpr(w.cond(), env, buf);
                String condBool = freshReg("c");
                buf.append("  ").append(condBool).append(" = icmp ne i64 ").append(c.value()).append(", 0\n");
                buf.append("  br i1 ").append(condBool)
                        .append(", label %").append(bodyLbl)
                        .append(", label %").append(endLbl).append("\n");
                buf.append(bodyLbl).append(":\n");
                StmtResult bodyR = genStmts(w.body(), new HashMap<>(env), buf);
                if (!bodyR.terminated()) buf.append("  br label %").append(condLbl).append("\n");
                buf.append(endLbl).append(":\n");
                yield false;
            }
            case Stmt.Print p -> {
                ExprResult r = genExpr(p.value(), env, buf);
                switch (r.ty()) {
                    case Type.TInt ignored ->
                        buf.append("  call i32 (ptr, ...) @printf(ptr @.fmt.int, i64 ")
                                .append(r.value()).append(")\n");
                    case Type.TString ignored ->
                        buf.append("  call i32 (ptr, ...) @printf(ptr @.fmt.str, ptr ")
                                .append(r.value()).append(")\n");
                    case Type.TList ignored -> {
                        String ph = addString("[list]");
                        buf.append("  call i32 (ptr, ...) @printf(ptr @.fmt.str, ptr ")
                                .append(ph).append(")\n");
                    }
                }
                yield false;
            }
            case Stmt.Return ret -> {
                ExprResult r = genExpr(ret.value(), env, buf);
                buf.append("  ret ").append(llvmType(r.ty()))
                        .append(" ").append(r.value()).append("\n");
                yield true;
            }
            case Stmt.ExprStmt es -> {
                genExpr(es.value(), env, buf);
                yield false;
            }
        };
    }

    // === 式の生成 ===
    private ExprResult genExpr(Expr e, Map<String, VarSlot> env, StringBuilder buf) {
        return switch (e) {
            case Expr.IntLit i -> new ExprResult(Long.toString(i.value()), new Type.TInt());
            case Expr.StrLit s -> new ExprResult(addString(s.value()), new Type.TString());
            case Expr.Var v -> {
                VarSlot slot = env.get(v.name());
                String r = freshReg("v");
                buf.append("  ").append(r).append(" = load ").append(llvmType(slot.ty()))
                        .append(", ptr ").append(slot.ptr()).append("\n");
                yield new ExprResult(r, slot.ty());
            }
            case Expr.Neg neg -> {
                ExprResult inner = genExpr(neg.inner(), env, buf);
                String r = freshReg("neg");
                buf.append("  ").append(r).append(" = sub i64 0, ").append(inner.value()).append("\n");
                yield new ExprResult(r, new Type.TInt());
            }
            case Expr.BinOp b -> {
                ExprResult l = genExpr(b.left(), env, buf);
                ExprResult r = genExpr(b.right(), env, buf);
                yield switch (b.op()) {
                    case "+" -> emitArith("add",  l.value(), r.value(), buf);
                    case "-" -> emitArith("sub",  l.value(), r.value(), buf);
                    case "*" -> emitArith("mul",  l.value(), r.value(), buf);
                    case "/" -> emitArith("sdiv", l.value(), r.value(), buf);
                    case "%" -> emitArith("srem", l.value(), r.value(), buf);
                    case "==" -> emitCmp("eq",  l.value(), r.value(), buf);
                    case "!=" -> emitCmp("ne",  l.value(), r.value(), buf);
                    case "<"  -> emitCmp("slt", l.value(), r.value(), buf);
                    case "<=" -> emitCmp("sle", l.value(), r.value(), buf);
                    case ">"  -> emitCmp("sgt", l.value(), r.value(), buf);
                    case ">=" -> emitCmp("sge", l.value(), r.value(), buf);
                    default -> throw new RuntimeException("bad op " + b.op());
                };
            }
            case Expr.Call c -> {
                FunSig sig = funcs.get(c.name());
                if (sig == null) throw new RuntimeException("unknown function: " + c.name());
                StringBuilder args = new StringBuilder();
                for (int i = 0; i < c.args().size(); i++) {
                    ExprResult av = genExpr(c.args().get(i), env, buf);
                    Type pty = sig.params().get(i).ty();
                    if (i > 0) args.append(", ");
                    args.append(llvmType(pty)).append(" ").append(av.value());
                }
                String r = freshReg("call");
                buf.append("  ").append(r).append(" = call ").append(llvmType(sig.retType()))
                        .append(" @").append(c.name()).append("(").append(args).append(")\n");
                yield new ExprResult(r, sig.retType());
            }
            case Expr.Index idx -> {
                ExprResult arr = genExpr(idx.arr(), env, buf);
                ExprResult ix  = genExpr(idx.idx(), env, buf);
                Type elemTy;
                if (arr.ty() instanceof Type.TList tl) elemTy = tl.elem();
                else throw new RuntimeException("cannot index non-list: " + arr.ty());
                String ep = freshReg("ep");
                buf.append("  ").append(ep).append(" = getelementptr ").append(llvmType(elemTy))
                        .append(", ptr ").append(arr.value())
                        .append(", i64 ").append(ix.value()).append("\n");
                String r = freshReg("elem");
                buf.append("  ").append(r).append(" = load ").append(llvmType(elemTy))
                        .append(", ptr ").append(ep).append("\n");
                yield new ExprResult(r, elemTy);
            }
            case Expr.ListLit ll -> {
                if (ll.elems().isEmpty()) throw new RuntimeException("empty list not supported");
                ExprResult first = genExpr(ll.elems().get(0), env, buf);
                Type elemTy = first.ty();
                int byteSize = ll.elems().size() * 8;
                String basePtr = freshReg("list");
                buf.append("  ").append(basePtr).append(" = call ptr @malloc(i64 ").append(byteSize).append(")\n");
                String ep0 = freshReg("ep");
                buf.append("  ").append(ep0).append(" = getelementptr ").append(llvmType(elemTy))
                        .append(", ptr ").append(basePtr).append(", i64 0\n");
                buf.append("  store ").append(llvmType(elemTy)).append(" ").append(first.value())
                        .append(", ptr ").append(ep0).append("\n");
                for (int i = 1; i < ll.elems().size(); i++) {
                    ExprResult v = genExpr(ll.elems().get(i), env, buf);
                    String ep = freshReg("ep");
                    buf.append("  ").append(ep).append(" = getelementptr ").append(llvmType(elemTy))
                            .append(", ptr ").append(basePtr).append(", i64 ").append(i).append("\n");
                    buf.append("  store ").append(llvmType(elemTy)).append(" ").append(v.value())
                            .append(", ptr ").append(ep).append("\n");
                }
                yield new ExprResult(basePtr, new Type.TList(elemTy));
            }
        };
    }

    private ExprResult emitArith(String op, String lv, String rv, StringBuilder buf) {
        String out = freshReg("b");
        buf.append("  ").append(out).append(" = ").append(op).append(" i64 ")
                .append(lv).append(", ").append(rv).append("\n");
        return new ExprResult(out, new Type.TInt());
    }

    private ExprResult emitCmp(String pred, String lv, String rv, StringBuilder buf) {
        String bool = freshReg("cmp");
        buf.append("  ").append(bool).append(" = icmp ").append(pred).append(" i64 ")
                .append(lv).append(", ").append(rv).append("\n");
        String ext = freshReg("ext");
        buf.append("  ").append(ext).append(" = zext i1 ").append(bool).append(" to i64\n");
        return new ExprResult(ext, new Type.TInt());
    }

    // === 最終結合 ===

    private String result() {
        StringBuilder sb = new StringBuilder();
        sb.append("; ModuleID = 'nb-lang'\n");
        sb.append("target triple = \"").append(targetTriple()).append("\"\n\n");
        sb.append("@.fmt.int = private constant [5 x i8] c\"%ld\\0A\\00\"\n");
        sb.append("@.fmt.str = private constant [4 x i8] c\"%s\\0A\\00\"\n");
        sb.append("declare i32 @printf(ptr, ...)\n");
        sb.append("declare ptr @malloc(i64)\n\n");
        sb.append(globalDecls);
        sb.append("\n");
        sb.append(funcDefs);
        sb.append(mainBuf);
        return sb.toString();
    }

    private static String targetTriple() {
        String os = System.getProperty("os.name", "").toLowerCase();
        if (os.startsWith("mac")) return "arm64-apple-macosx15.0.0";
        return "x86_64-pc-linux-gnu";
    }
}
