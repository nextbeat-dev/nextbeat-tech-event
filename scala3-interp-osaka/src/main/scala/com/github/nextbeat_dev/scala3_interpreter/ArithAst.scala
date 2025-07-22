enum Exp {
  case BinExp(op: String, lhs: Exp, rhs: Exp)     // 二項演算
  case VInt(value: Int)                           // 整数
}
import Exp.*

@main def run(): Unit = {
  println(VInt(100))                              // 100
  println(BinExp("+", VInt(1), VInt(2)))          // 1 + 2
  println(
    BinExp("+", 
      VInt(1),
      BinExp("*", VInt(2), VInt(3))              // 1 + 2 * 3
    )
  )
}
