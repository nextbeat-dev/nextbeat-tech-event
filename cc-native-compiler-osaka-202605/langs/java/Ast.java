package nblang;

import java.util.List;

public final class Ast {
    private Ast() {}

    public sealed interface Type permits Type.TInt, Type.TString, Type.TList {
        record TInt() implements Type {
            @Override public String toString() { return "int"; }
        }
        record TString() implements Type {
            @Override public String toString() { return "string"; }
        }
        record TList(Type elem) implements Type {
            @Override public String toString() { return "list<" + elem + ">"; }
        }
    }

    public sealed interface Expr permits
            Expr.IntLit, Expr.StrLit, Expr.Var, Expr.BinOp,
            Expr.Neg, Expr.Call, Expr.Index, Expr.ListLit {
        record IntLit(long value) implements Expr {}
        record StrLit(String value) implements Expr {}
        record Var(String name) implements Expr {}
        record BinOp(String op, Expr left, Expr right) implements Expr {}
        record Neg(Expr inner) implements Expr {}
        record Call(String name, List<Expr> args) implements Expr {}
        record Index(Expr arr, Expr idx) implements Expr {}
        record ListLit(List<Expr> elems) implements Expr {}
    }

    public sealed interface Stmt permits
            Stmt.ValDef, Stmt.VarDef, Stmt.Reassign, Stmt.IfS,
            Stmt.WhileS, Stmt.Print, Stmt.Return, Stmt.ExprStmt {
        record ValDef(String name, Type declared, Expr init) implements Stmt {}
        record VarDef(String name, Type declared, Expr init) implements Stmt {}
        record Reassign(String name, Expr value) implements Stmt {}
        record IfS(Expr cond, List<Stmt> thenBlk, List<Stmt> elseBlk) implements Stmt {}
        record WhileS(Expr cond, List<Stmt> body) implements Stmt {}
        record Print(Expr value) implements Stmt {}
        record Return(Expr value) implements Stmt {}
        record ExprStmt(Expr value) implements Stmt {}
    }

    public record Param(String name, Type ty) {}

    public record FunDef(String name, List<Param> params, Type retType, List<Stmt> body) {}

    public record Program(List<FunDef> funcs, List<Stmt> topStmts) {}
}
