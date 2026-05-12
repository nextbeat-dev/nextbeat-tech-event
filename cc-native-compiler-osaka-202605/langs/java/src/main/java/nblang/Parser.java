package nblang;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import nblang.Ast.Expr;
import nblang.Ast.FunDef;
import nblang.Ast.Param;
import nblang.Ast.Program;
import nblang.Ast.Stmt;
import nblang.Ast.Type;
import nblang.Lexer.Token;
import nblang.Lexer.TokenWithPos;

public final class Parser {
    public static final class ParseError extends RuntimeException {
        public ParseError(String msg) { super(msg); }
    }

    private static final Set<String> CMP_OPS = Set.of("==", "!=", "<", "<=", ">", ">=");

    private final List<TokenWithPos> toks;
    private int pos = 0;

    private Parser(List<TokenWithPos> tokens) {
        this.toks = tokens;
    }

    public static Program parse(List<TokenWithPos> tokens) {
        return new Parser(tokens).parseProgram();
    }

    private Token peek() { return toks.get(pos).token(); }
    private int lineOf() { return toks.get(pos).line(); }

    private Token advance() {
        Token t = toks.get(pos).token();
        if (!(t instanceof Token.TEof)) pos++;
        return t;
    }

    private boolean isPunct(Token t, String s) {
        return t instanceof Token.TPunct p && p.sym().equals(s);
    }

    private boolean isOp(Token t, String s) {
        return t instanceof Token.TOp o && o.op().equals(s);
    }

    private boolean isKw(Token t, String s) {
        return t instanceof Token.TKw k && k.name().equals(s);
    }

    private void expectPunct(String s) {
        Token t = peek();
        if (isPunct(t, s)) { advance(); return; }
        throw new ParseError("expected '" + s + "' but got " + t + " at line " + lineOf());
    }

    private void expectOp(String s) {
        Token t = peek();
        if (isOp(t, s)) { advance(); return; }
        throw new ParseError("expected '" + s + "' but got " + t + " at line " + lineOf());
    }

    private void expectKw(String s) {
        Token t = peek();
        if (isKw(t, s)) { advance(); return; }
        throw new ParseError("expected keyword '" + s + "' but got " + t + " at line " + lineOf());
    }

    private String expectIdent() {
        Token t = peek();
        if (t instanceof Token.TIdent id) { advance(); return id.name(); }
        throw new ParseError("expected identifier but got " + t + " at line " + lineOf());
    }

    private Program parseProgram() {
        List<FunDef> funcs = new ArrayList<>();
        List<Stmt> stmts = new ArrayList<>();
        while (!(peek() instanceof Token.TEof)) {
            if (isKw(peek(), "function")) {
                funcs.add(parseFunction());
            } else {
                stmts.add(parseStatement());
            }
        }
        return new Program(List.copyOf(funcs), List.copyOf(stmts));
    }

    private FunDef parseFunction() {
        expectKw("function");
        String name = expectIdent();
        expectPunct("(");
        List<Param> params = new ArrayList<>();
        if (!isPunct(peek(), ")")) {
            params.add(parseParam());
            while (isPunct(peek(), ",")) {
                advance();
                params.add(parseParam());
            }
        }
        expectPunct(")");
        expectPunct(":");
        Type retTy = parseType();
        List<Stmt> body = parseBlock();
        return new FunDef(name, List.copyOf(params), retTy, body);
    }

    private Param parseParam() {
        String name = expectIdent();
        expectPunct(":");
        Type ty = parseType();
        return new Param(name, ty);
    }

    private Type parseType() {
        Token t = peek();
        if (isKw(t, "int"))    { advance(); return new Type.TInt(); }
        if (isKw(t, "string")) { advance(); return new Type.TString(); }
        if (isKw(t, "list")) {
            advance();
            expectOp("<");
            Type elem = parseType();
            expectOp(">");
            return new Type.TList(elem);
        }
        throw new ParseError("expected type but got " + t + " at line " + lineOf());
    }

    private List<Stmt> parseBlock() {
        expectPunct("{");
        List<Stmt> stmts = new ArrayList<>();
        while (!isPunct(peek(), "}")) {
            stmts.add(parseStatement());
        }
        expectPunct("}");
        return List.copyOf(stmts);
    }

    private Stmt parseStatement() {
        Token t = peek();
        if (isKw(t, "val"))    return parseValDef();
        if (isKw(t, "var"))    return parseVarDef();
        if (isKw(t, "if"))     return parseIf();
        if (isKw(t, "while"))  return parseWhile();
        if (isKw(t, "print"))  return parsePrint();
        if (isKw(t, "return")) return parseReturn();
        if (t instanceof Token.TIdent) {
            if (pos + 1 < toks.size() && isOp(toks.get(pos + 1).token(), "=")) {
                return parseReassign();
            }
        }
        return parseExprStmt();
    }

    private Stmt parseValDef() {
        expectKw("val");
        String name = expectIdent();
        Type ty = null;
        if (isPunct(peek(), ":")) {
            advance();
            ty = parseType();
        }
        expectOp("=");
        Expr init = parseExpr();
        expectPunct(";");
        return new Stmt.ValDef(name, ty, init);
    }

    private Stmt parseVarDef() {
        expectKw("var");
        String name = expectIdent();
        Type ty = null;
        if (isPunct(peek(), ":")) {
            advance();
            ty = parseType();
        }
        expectOp("=");
        Expr init = parseExpr();
        expectPunct(";");
        return new Stmt.VarDef(name, ty, init);
    }

    private Stmt parseReassign() {
        String name = expectIdent();
        expectOp("=");
        Expr value = parseExpr();
        expectPunct(";");
        return new Stmt.Reassign(name, value);
    }

    private Stmt parseIf() {
        expectKw("if");
        expectPunct("(");
        Expr cond = parseExpr();
        expectPunct(")");
        List<Stmt> thenBlk = parseBlock();
        List<Stmt> elseBlk = List.of();
        if (isKw(peek(), "else")) {
            advance();
            elseBlk = parseBlock();
        }
        return new Stmt.IfS(cond, thenBlk, elseBlk);
    }

    private Stmt parseWhile() {
        expectKw("while");
        expectPunct("(");
        Expr cond = parseExpr();
        expectPunct(")");
        List<Stmt> body = parseBlock();
        return new Stmt.WhileS(cond, body);
    }

    private Stmt parsePrint() {
        expectKw("print");
        expectPunct("(");
        Expr value = parseExpr();
        expectPunct(")");
        expectPunct(";");
        return new Stmt.Print(value);
    }

    private Stmt parseReturn() {
        expectKw("return");
        Expr value = parseExpr();
        expectPunct(";");
        return new Stmt.Return(value);
    }

    private Stmt parseExprStmt() {
        Expr e = parseExpr();
        expectPunct(";");
        return new Stmt.ExprStmt(e);
    }

    // === Expressions ===

    private Expr parseExpr() { return parseComparison(); }

    private Expr parseComparison() {
        Expr left = parseAdditive();
        while (true) {
            Token t = peek();
            if (t instanceof Token.TOp op && CMP_OPS.contains(op.op())) {
                advance();
                Expr right = parseAdditive();
                left = new Expr.BinOp(op.op(), left, right);
            } else break;
        }
        return left;
    }

    private Expr parseAdditive() {
        Expr left = parseMultiplicative();
        while (true) {
            Token t = peek();
            if (t instanceof Token.TOp op && (op.op().equals("+") || op.op().equals("-"))) {
                advance();
                Expr right = parseMultiplicative();
                left = new Expr.BinOp(op.op(), left, right);
            } else break;
        }
        return left;
    }

    private Expr parseMultiplicative() {
        Expr left = parseUnary();
        while (true) {
            Token t = peek();
            if (t instanceof Token.TOp op &&
                (op.op().equals("*") || op.op().equals("/") || op.op().equals("%"))) {
                advance();
                Expr right = parseUnary();
                left = new Expr.BinOp(op.op(), left, right);
            } else break;
        }
        return left;
    }

    private Expr parseUnary() {
        if (isOp(peek(), "-")) {
            advance();
            return new Expr.Neg(parsePostfix());
        }
        return parsePostfix();
    }

    private Expr parsePostfix() {
        Expr e = parsePrimary();
        while (true) {
            Token t = peek();
            if (isPunct(t, "(")) {
                if (e instanceof Expr.Var v) {
                    advance();
                    List<Expr> args = new ArrayList<>();
                    if (!isPunct(peek(), ")")) {
                        args.add(parseExpr());
                        while (isPunct(peek(), ",")) {
                            advance();
                            args.add(parseExpr());
                        }
                    }
                    expectPunct(")");
                    e = new Expr.Call(v.name(), List.copyOf(args));
                } else break;
            } else if (isPunct(t, "[")) {
                advance();
                Expr idx = parseExpr();
                expectPunct("]");
                e = new Expr.Index(e, idx);
            } else break;
        }
        return e;
    }

    private Expr parsePrimary() {
        Token t = peek();
        if (t instanceof Token.TInt iv) { advance(); return new Expr.IntLit(iv.value()); }
        if (t instanceof Token.TStr sv) { advance(); return new Expr.StrLit(sv.value()); }
        if (t instanceof Token.TIdent id) { advance(); return new Expr.Var(id.name()); }
        if (isPunct(t, "(")) {
            advance();
            Expr e = parseExpr();
            expectPunct(")");
            return e;
        }
        if (isPunct(t, "[")) {
            advance();
            List<Expr> elems = new ArrayList<>();
            if (!isPunct(peek(), "]")) {
                elems.add(parseExpr());
                while (isPunct(peek(), ",")) {
                    advance();
                    elems.add(parseExpr());
                }
            }
            expectPunct("]");
            return new Expr.ListLit(List.copyOf(elems));
        }
        throw new ParseError("unexpected token " + t + " at line " + lineOf());
    }
}
