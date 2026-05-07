// nb-lang compiler — Java reference implementation (Phase 1)
// 実行: java Main.java <source.nb>

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Main {

    // ===== AST =====

    sealed interface Expr permits IntLit, Var, BinOp {}
    record IntLit(long value)                            implements Expr {}
    record Var(String name)                              implements Expr {}
    record BinOp(String op, Expr left, Expr right)       implements Expr {}

    sealed interface Stmt permits ValDef, VarDef, Reassign, If, While, Print {}
    record ValDef(String name, Expr init)                implements Stmt {}
    record VarDef(String name, Expr init)                implements Stmt {}
    record Reassign(String name, Expr value)             implements Stmt {}
    record If(Expr cond, List<Stmt> thenBlk, List<Stmt> elseBlk) implements Stmt {}
    record While(Expr cond, List<Stmt> body)             implements Stmt {}
    record Print(Expr value)                             implements Stmt {}

    // ===== Token =====

    sealed interface Token permits IntT, Ident, Kw, Op, LParen, RParen, LBrace, RBrace, Semi, EOF {}
    record IntT(long value)        implements Token {}
    record Ident(String name)      implements Token {}
    record Kw(String name)         implements Token {}
    record Op(String value)        implements Token {}
    record LParen()                implements Token {}
    record RParen()                implements Token {}
    record LBrace()                implements Token {}
    record RBrace()                implements Token {}
    record Semi()                  implements Token {}
    record EOF()                   implements Token {}

    // ===== Lexer =====

    static final Set<String> KEYWORDS = Set.of("val", "var", "if", "else", "while", "print");

    static List<Token> tokenize(String src) {
        List<Token> tokens = new ArrayList<>();
        int i = 0, n = src.length();

        while (i < n) {
            char c = src.charAt(i);
            if (Character.isWhitespace(c)) { i++; continue; }
            if (c == '/' && i + 1 < n && src.charAt(i + 1) == '/') {
                while (i < n && src.charAt(i) != '\n') i++;
                continue;
            }
            if (Character.isDigit(c)) {
                int j = i;
                while (j < n && Character.isDigit(src.charAt(j))) j++;
                tokens.add(new IntT(Long.parseLong(src.substring(i, j))));
                i = j;
                continue;
            }
            if (Character.isLetter(c) || c == '_') {
                int j = i;
                while (j < n && (Character.isLetterOrDigit(src.charAt(j)) || src.charAt(j) == '_')) j++;
                String word = src.substring(i, j);
                tokens.add(KEYWORDS.contains(word) ? new Kw(word) : new Ident(word));
                i = j;
                continue;
            }
            if (c == '(') { tokens.add(new LParen()); i++; continue; }
            if (c == ')') { tokens.add(new RParen()); i++; continue; }
            if (c == '{') { tokens.add(new LBrace()); i++; continue; }
            if (c == '}') { tokens.add(new RBrace()); i++; continue; }
            if (c == ';') { tokens.add(new Semi());   i++; continue; }
            if (c == '=' && i + 1 < n && src.charAt(i + 1) == '=') { tokens.add(new Op("==")); i += 2; continue; }
            if (c == '!' && i + 1 < n && src.charAt(i + 1) == '=') { tokens.add(new Op("!=")); i += 2; continue; }
            if (c == '<' && i + 1 < n && src.charAt(i + 1) == '=') { tokens.add(new Op("<=")); i += 2; continue; }
            if (c == '>' && i + 1 < n && src.charAt(i + 1) == '=') { tokens.add(new Op(">=")); i += 2; continue; }
            if ("+-*/%<>=".indexOf(c) >= 0) { tokens.add(new Op(String.valueOf(c))); i++; continue; }
            throw new RuntimeException("Unknown char: '" + c + "' at " + i);
        }
        tokens.add(new EOF());
        return tokens;
    }

    // ===== Parser =====

    static class Parser {
        private final List<Token> tokens;
        private int pos = 0;

        Parser(List<Token> tokens) { this.tokens = tokens; }

        private Token peek() { return tokens.get(pos); }
        private Token consume() { return tokens.get(pos++); }

        List<Stmt> parseProgram() {
            List<Stmt> stmts = new ArrayList<>();
            while (!(peek() instanceof EOF)) stmts.add(parseStmt());
            return stmts;
        }

        private Stmt parseStmt() {
            Token t = peek();
            if (t instanceof Kw kw) {
                return switch (kw.name()) {
                    case "val"   -> parseValDef();
                    case "var"   -> parseVarDef();
                    case "if"    -> parseIf();
                    case "while" -> parseWhile();
                    case "print" -> parsePrint();
                    default      -> throw new RuntimeException("Unexpected keyword: " + kw.name());
                };
            }
            if (t instanceof Ident) return parseReassign();
            throw new RuntimeException("Unexpected token: " + t);
        }

        private Stmt parseValDef() {
            consume(); // val
            String name = consumeIdent();
            expectOp("=");
            Expr init = parseExpr();
            expectSemi();
            return new ValDef(name, init);
        }

        private Stmt parseVarDef() {
            consume(); // var
            String name = consumeIdent();
            expectOp("=");
            Expr init = parseExpr();
            expectSemi();
            return new VarDef(name, init);
        }

        private Stmt parseReassign() {
            String name = consumeIdent();
            expectOp("=");
            Expr value = parseExpr();
            expectSemi();
            return new Reassign(name, value);
        }

        private Stmt parseIf() {
            consume(); // if
            expect(LParen.class);
            Expr cond = parseExpr();
            expect(RParen.class);
            List<Stmt> thenBlk = parseBlock();
            List<Stmt> elseBlk = new ArrayList<>();
            if (peek() instanceof Kw kw && kw.name().equals("else")) {
                consume();
                elseBlk = parseBlock();
            }
            return new If(cond, thenBlk, elseBlk);
        }

        private Stmt parseWhile() {
            consume(); // while
            expect(LParen.class);
            Expr cond = parseExpr();
            expect(RParen.class);
            List<Stmt> body = parseBlock();
            return new While(cond, body);
        }

        private Stmt parsePrint() {
            consume(); // print
            expect(LParen.class);
            Expr v = parseExpr();
            expect(RParen.class);
            expectSemi();
            return new Print(v);
        }

        private List<Stmt> parseBlock() {
            expect(LBrace.class);
            List<Stmt> stmts = new ArrayList<>();
            while (!(peek() instanceof RBrace)) stmts.add(parseStmt());
            consume(); // }
            return stmts;
        }

        private Expr parseExpr() { return parseComparison(); }

        private Expr parseComparison() {
            Expr left = parseAdditive();
            while (isOp(Set.of("==", "!=", "<", "<=", ">", ">="))) {
                String op = ((Op) consume()).value();
                Expr right = parseAdditive();
                left = new BinOp(op, left, right);
            }
            return left;
        }

        private Expr parseAdditive() {
            Expr left = parseMultiplicative();
            while (isOp(Set.of("+", "-"))) {
                String op = ((Op) consume()).value();
                Expr right = parseMultiplicative();
                left = new BinOp(op, left, right);
            }
            return left;
        }

        private Expr parseMultiplicative() {
            Expr left = parsePrimary();
            while (isOp(Set.of("*", "/", "%"))) {
                String op = ((Op) consume()).value();
                Expr right = parsePrimary();
                left = new BinOp(op, left, right);
            }
            return left;
        }

        private Expr parsePrimary() {
            Token t = consume();
            if (t instanceof IntT it) return new IntLit(it.value());
            if (t instanceof Ident id) return new Var(id.name());
            if (t instanceof LParen) {
                Expr e = parseExpr();
                expect(RParen.class);
                return e;
            }
            throw new RuntimeException("Expected primary, got " + t);
        }

        private boolean isOp(Set<String> ops) {
            return peek() instanceof Op op && ops.contains(op.value());
        }

        private String consumeIdent() {
            Token t = consume();
            if (!(t instanceof Ident id)) throw new RuntimeException("Expected ident, got " + t);
            return id.name();
        }

        private void expectOp(String value) {
            Token t = consume();
            if (!(t instanceof Op op) || !op.value().equals(value)) {
                throw new RuntimeException("Expected '" + value + "', got " + t);
            }
        }

        private void expect(Class<? extends Token> kind) {
            Token t = consume();
            if (!kind.isInstance(t)) {
                throw new RuntimeException("Expected " + kind.getSimpleName() + ", got " + t);
            }
        }

        private void expectSemi() { expect(Semi.class); }
    }

    // ===== CodeGen =====

    static class CodeGen {
        private final StringBuilder sb = new StringBuilder();
        private int tempCounter = 0;
        private int labelCounter = 0;

        private String fresh() {
            tempCounter++;
            return "%t" + tempCounter;
        }

        private String freshLabel(String prefix) {
            labelCounter++;
            return prefix + labelCounter;
        }

        private void emit(String line) { sb.append(line).append('\n'); }

        private String detectTriple() {
            String os = System.getProperty("os.name").toLowerCase();
            return os.contains("mac") ? "arm64-apple-macosx15.0.0" : "x86_64-pc-linux-gnu";
        }

        String gen(List<Stmt> program) {
            emit("; ModuleID = 'nb-lang'");
            emit("target triple = \"" + detectTriple() + "\"");
            emit("");
            emit("@fmt = private constant [5 x i8] c\"%ld\\0A\\00\"");
            emit("declare i32 @printf(ptr, ...)");
            emit("");
            emit("define i32 @main() {");
            emit("entry:");
            for (Stmt s : program) genStmt(s);
            emit("  ret i32 0");
            emit("}");
            return sb.toString();
        }

        private void genStmt(Stmt s) {
            if (s instanceof ValDef d) {
                emit("  %" + d.name() + " = alloca i64, align 8");
                String v = genExpr(d.init());
                emit("  store i64 " + v + ", ptr %" + d.name());
            } else if (s instanceof VarDef d) {
                emit("  %" + d.name() + " = alloca i64, align 8");
                String v = genExpr(d.init());
                emit("  store i64 " + v + ", ptr %" + d.name());
            } else if (s instanceof Reassign r) {
                String v = genExpr(r.value());
                emit("  store i64 " + v + ", ptr %" + r.name());
            } else if (s instanceof Print p) {
                String v = genExpr(p.value());
                emit("  call i32 (ptr, ...) @printf(ptr @fmt, i64 " + v + ")");
            } else if (s instanceof If i) {
                String c = genExpr(i.cond());
                String ci1 = fresh();
                emit("  " + ci1 + " = icmp ne i64 " + c + ", 0");
                String thenL = freshLabel("then");
                String elseL = freshLabel("else");
                String endL  = freshLabel("ifend");
                emit("  br i1 " + ci1 + ", label %" + thenL + ", label %" + elseL);
                emit(thenL + ":");
                for (Stmt st : i.thenBlk()) genStmt(st);
                emit("  br label %" + endL);
                emit(elseL + ":");
                for (Stmt st : i.elseBlk()) genStmt(st);
                emit("  br label %" + endL);
                emit(endL + ":");
            } else if (s instanceof While w) {
                String condL = freshLabel("cond");
                String bodyL = freshLabel("body");
                String exitL = freshLabel("exit");
                emit("  br label %" + condL);
                emit(condL + ":");
                String c = genExpr(w.cond());
                String ci1 = fresh();
                emit("  " + ci1 + " = icmp ne i64 " + c + ", 0");
                emit("  br i1 " + ci1 + ", label %" + bodyL + ", label %" + exitL);
                emit(bodyL + ":");
                for (Stmt st : w.body()) genStmt(st);
                emit("  br label %" + condL);
                emit(exitL + ":");
            }
        }

        private String genExpr(Expr e) {
            if (e instanceof IntLit il) return Long.toString(il.value());
            if (e instanceof Var v) {
                String r = fresh();
                emit("  " + r + " = load i64, ptr %" + v.name());
                return r;
            }
            if (e instanceof BinOp b) {
                String lv = genExpr(b.left());
                String rv = genExpr(b.right());
                String res = fresh();
                Map<String, String> arith = Map.of(
                    "+", "add", "-", "sub", "*", "mul", "/", "sdiv", "%", "srem"
                );
                Map<String, String> cmp = Map.of(
                    "==", "eq", "!=", "ne", "<", "slt", "<=", "sle", ">", "sgt", ">=", "sge"
                );
                if (arith.containsKey(b.op())) {
                    emit("  " + res + " = " + arith.get(b.op()) + " i64 " + lv + ", " + rv);
                } else if (cmp.containsKey(b.op())) {
                    String tmp = fresh();
                    emit("  " + tmp + " = icmp " + cmp.get(b.op()) + " i64 " + lv + ", " + rv);
                    emit("  " + res + " = zext i1 " + tmp + " to i64");
                } else {
                    throw new RuntimeException("Unknown op: " + b.op());
                }
                return res;
            }
            throw new RuntimeException("Unknown expr: " + e);
        }
    }

    // ===== Main =====

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            System.err.println("usage: java Main.java <source.nb>");
            System.exit(1);
        }
        String src = Files.readString(Path.of(args[0]));
        List<Token> tokens = tokenize(src);
        List<Stmt> program = new Parser(tokens).parseProgram();
        String ir = new CodeGen().gen(program);
        System.out.print(ir);
    }
}
