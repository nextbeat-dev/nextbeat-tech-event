import scala.collection.mutable.{Map => MMap}

enum Exp {
  case BinExp(op: String, lhs: Exp, rhs: Exp)     // 二項演算
  case VInt(value: Int)                           // 整数

   // 新規追加
  case Assignment(name: String, expr: Exp)  // 代入
  case Ident(name: String)                  // 変数参照
  case SeqExp(expressions: List[Exp])       // 連接
  case If(condition: Exp, thenClause: Exp, elseClause: Exp)
  case While(condition: Exp, body: Exp)
}

import Exp.*
extension (a: Exp) {
  def |+|(b: Exp): Exp = BinExp("+", a, b)
  def |-|(b: Exp): Exp = BinExp("-", a, b)
  def |*|(b: Exp): Exp = BinExp("*", a, b)
  def |/|(b: Exp): Exp = BinExp("/", a, b)
  def |<|(b: Exp): Exp = BinExp("<", a, b)
  def |>|(b: Exp): Exp = BinExp(">", a, b)
  def |==|(b: Exp): Exp = BinExp("==", a, b)
  def |!=|(b: Exp): Exp = BinExp("!=", a, b)
}

def tInt(value: Int): Exp = VInt(value)
def tIf(cond: Exp, thenE: Exp, elseE: Exp): Exp =
  If(cond, thenE, elseE)

def eval(e: Exp, env: MMap[String, Int] = MMap.empty): Int = {
  def evalRec(e: Exp): Int = e match {
    case VInt(value) => value
    case BinExp("+", lhs, rhs) =>  evalRec(lhs) + evalRec(rhs)
    case BinExp("-", lhs, rhs) => evalRec(lhs) - evalRec(rhs)
    case BinExp("*", lhs, rhs) => evalRec(lhs) * evalRec(rhs)
    case BinExp("/", lhs, rhs) => evalRec(lhs) / evalRec(rhs)
    case BinExp("<", lhs, rhs) =>
      if (evalRec(lhs) < evalRec(rhs)) 1 else 0
    case BinExp(">", lhs, rhs) =>
      if (evalRec(lhs) > evalRec(rhs)) 1 else 0
    case BinExp("==", lhs, rhs) =>
      if (evalRec(lhs) == evalRec(rhs)) 1 else 0
    case BinExp("!=", lhs, rhs) =>
      if (evalRec(lhs) != evalRec(rhs)) 1 else 0
    case Assignment(name, expr) =>
      val v = evalRec(expr)
      env(name) = v  // 環境に登録
      v
    case Ident(name) =>
      env.getOrElse(name, sys.error(s"Undefined: $name"))
    case SeqExp(bodies) =>
      var result: Int = 0
      bodies.foreach { expr =>
        result = evalRec(expr)
      }
      result  // 最後の式の結果を返す
    case If(condition, thenClause, elseClause) =>
      if (evalRec(condition) != 0)  // 0以外は真
        evalRec(thenClause)
      else
        evalRec(elseClause)
    case While(condition, body) =>
      while (evalRec(condition) != 0) {
        evalRec(body)
      }
      0  // while式の結果は0
  }
  evalRec(e)
}

@main def run(): Unit = {
  // i = 0; sum = 0;
  // while(i < 10) {
  // i = i + 1;
  // sum = sum + i;
  // }
  // sum
  val prog = SeqExp(List(
    Assignment("i", VInt(0)),
    Assignment("sum", VInt(0)),
    While(
      Ident("i") |<| VInt(10),
      SeqExp(List(
        Assignment("i", Ident("i") |+| VInt(1)),
        Assignment("sum", Ident("sum") |+| Ident("i"))
      ))
    ),
    Ident("sum")
  ))
  println(eval(prog, MMap.empty))  // 10
}

