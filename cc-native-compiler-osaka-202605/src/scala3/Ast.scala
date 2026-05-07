package nblang

enum Expr:
  case IntLit(v: Long)
  case Var(name: String)
  case BinOp(op: String, l: Expr, r: Expr)

enum Stmt:
  case ValDef(name: String, init: Expr)
  case VarDef(name: String, init: Expr)
  case Reassign(name: String, value: Expr)
  case If(cond: Expr, thenBlk: List[Stmt], elseBlk: List[Stmt])
  case While(cond: Expr, body: List[Stmt])
  case Print(value: Expr)
