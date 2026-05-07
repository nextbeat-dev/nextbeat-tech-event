package nblang

class CodeGen:
  private val sb = StringBuilder()
  private var tempCounter = 0
  private var labelCounter = 0

  private def fresh(): String =
    tempCounter += 1
    s"%t$tempCounter"

  private def freshLabel(prefix: String): String =
    labelCounter += 1
    s"$prefix$labelCounter"

  private def emit(line: String): Unit =
    sb.append(line).append('\n')

  private def detectTriple: String =
    val os = System.getProperty("os.name").toLowerCase
    if os.contains("mac") then "arm64-apple-macosx15.0.0"
    else "x86_64-pc-linux-gnu"

  def gen(program: List[Stmt]): String =
    emit("; ModuleID = 'nb-lang'")
    emit(s"""target triple = "$detectTriple"""")
    emit("")
    emit("@fmt = private constant [5 x i8] c\"%ld\\0A\\00\"")
    emit("declare i32 @printf(ptr, ...)")
    emit("")
    emit("define i32 @main() {")
    emit("entry:")

    program.foreach(genStmt)

    emit("  ret i32 0")
    emit("}")
    sb.toString

  private def genStmt(stmt: Stmt): Unit = stmt match
    case Stmt.ValDef(name, init) =>
      emit(s"  %$name = alloca i64, align 8")
      val v = genExpr(init)
      emit(s"  store i64 $v, ptr %$name")

    case Stmt.VarDef(name, init) =>
      emit(s"  %$name = alloca i64, align 8")
      val v = genExpr(init)
      emit(s"  store i64 $v, ptr %$name")

    case Stmt.Reassign(name, value) =>
      val v = genExpr(value)
      emit(s"  store i64 $v, ptr %$name")

    case Stmt.Print(value) =>
      val v = genExpr(value)
      emit(s"  call i32 (ptr, ...) @printf(ptr @fmt, i64 $v)")

    case Stmt.If(cond, thenBlk, elseBlk) =>
      val c = genExpr(cond)
      val ci1 = fresh()
      emit(s"  $ci1 = icmp ne i64 $c, 0")
      val thenL = freshLabel("then")
      val elseL = freshLabel("else")
      val endL  = freshLabel("ifend")
      emit(s"  br i1 $ci1, label %$thenL, label %$elseL")
      emit(s"$thenL:")
      thenBlk.foreach(genStmt)
      emit(s"  br label %$endL")
      emit(s"$elseL:")
      elseBlk.foreach(genStmt)
      emit(s"  br label %$endL")
      emit(s"$endL:")

    case Stmt.While(cond, body) =>
      val condL = freshLabel("cond")
      val bodyL = freshLabel("body")
      val exitL = freshLabel("exit")
      emit(s"  br label %$condL")
      emit(s"$condL:")
      val c   = genExpr(cond)
      val ci1 = fresh()
      emit(s"  $ci1 = icmp ne i64 $c, 0")
      emit(s"  br i1 $ci1, label %$bodyL, label %$exitL")
      emit(s"$bodyL:")
      body.foreach(genStmt)
      emit(s"  br label %$condL")
      emit(s"$exitL:")

  private def genExpr(expr: Expr): String = expr match
    case Expr.IntLit(v) => v.toString

    case Expr.Var(name) =>
      val r = fresh()
      emit(s"  $r = load i64, ptr %$name")
      r

    case Expr.BinOp(op, l, r) =>
      val lv  = genExpr(l)
      val rv  = genExpr(r)
      val res = fresh()
      op match
        case "+"  => emit(s"  $res = add i64 $lv, $rv")
        case "-"  => emit(s"  $res = sub i64 $lv, $rv")
        case "*"  => emit(s"  $res = mul i64 $lv, $rv")
        case "/"  => emit(s"  $res = sdiv i64 $lv, $rv")
        case "%"  => emit(s"  $res = srem i64 $lv, $rv")
        case "==" => cmpToInt(res, "eq",  lv, rv)
        case "!=" => cmpToInt(res, "ne",  lv, rv)
        case "<"  => cmpToInt(res, "slt", lv, rv)
        case "<=" => cmpToInt(res, "sle", lv, rv)
        case ">"  => cmpToInt(res, "sgt", lv, rv)
        case ">=" => cmpToInt(res, "sge", lv, rv)
        case _    => throw new RuntimeException(s"Unknown op: $op")
      res

  private def cmpToInt(res: String, pred: String, lv: String, rv: String): Unit =
    val tmp = fresh()
    emit(s"  $tmp = icmp $pred i64 $lv, $rv")
    emit(s"  $res = zext i1 $tmp to i64")
