package nblang

enum Type:
  case TInt
  case TString
  case TList(elem: Type)

  override def toString: String = this match
    case Type.TInt        => "int"
    case Type.TString     => "string"
    case Type.TList(e)    => s"list<$e>"

enum Expr:
  case IntLit(v: Long)
  case StrLit(s: String)
  case Var(name: String)
  case BinOp(op: String, l: Expr, r: Expr)
  case Neg(e: Expr)
  case Call(name: String, args: List[Expr])
  case Index(arr: Expr, idx: Expr)
  case ListLit(elems: List[Expr])

enum Stmt:
  case ValDef(name: String, ty: Option[Type], init: Expr)
  case VarDef(name: String, ty: Option[Type], init: Expr)
  case Reassign(name: String, value: Expr)
  case IfS(cond: Expr, thenBlk: List[Stmt], elseBlk: List[Stmt])
  case WhileS(cond: Expr, body: List[Stmt])
  case Print(value: Expr)
  case Return(value: Expr)
  case ExprStmt(value: Expr)

case class FunDef(
    name: String,
    params: List[(String, Type)],
    retType: Type,
    body: List[Stmt]
)

case class Program(funcs: List[FunDef], topStmts: List[Stmt])
