enum Exp {
  case BinExp(op: String, lhs: Exp, rhs: Exp)     // 二項演算
  case VInt(value: Int)                           // 整数
}
import Exp.*
extension (a: Exp) {
  def |+|(b: Exp): Exp = BinExp("+", a, b)
  def |-|(b: Exp): Exp = BinExp("-", a, b)
  def |*|(b: Exp): Exp = BinExp("*", a, b)
  def |/|(b: Exp): Exp = BinExp("/", a, b)
}

def tInt(value: Int): Exp = VInt(value)

def eval(exp: Exp): Int = exp match {
  case VInt(value)            => value
  case BinExp("+", lhs, rhs)  => eval(lhs) + eval(rhs)
  case BinExp("-", lhs, rhs)  => eval(lhs) - eval(rhs)
  case BinExp("*", lhs, rhs)  => eval(lhs) * eval(rhs)
  case BinExp("/", lhs, rhs)  => eval(lhs) / eval(rhs)
}

@main def run(): Unit = {
  val exp = tInt(1) |+| (tInt(2) |*| tInt(3))  // 1 + 2 * 3
  println(eval(exp))  // 7
}
