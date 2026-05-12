package nblang

import scala.collection.mutable

object CodeGen:
  def generate(program: Program): String =
    val gen = new CodeGen()
    gen.gen(program)
    gen.result()

private case class FunSig(params: List[(String, Type)], retType: Type)

class CodeGen:
  private val globalDecls = StringBuilder()
  private val funcDefs    = StringBuilder()
  private val mainBuf     = StringBuilder()

  private var regCounter    = 0
  private var labelCounter  = 0
  private var strCounter    = 0
  private var suffixCounter = 0

  private var funcs: Map[String, FunSig] = Map.empty
  private val strPool = mutable.Map[String, String]()

  // === helpers ===

  private def freshReg(prefix: String): String =
    regCounter += 1
    s"%$prefix.$regCounter"

  private def freshLabel(prefix: String): String =
    labelCounter += 1
    s"$prefix.$labelCounter"

  private def freshSuffix(): String =
    suffixCounter += 1
    suffixCounter.toString

  private def llvmType(t: Type): String = t match
    case Type.TInt        => "i64"
    case Type.TString     => "ptr"
    case Type.TList(_)    => "ptr"

  private def defaultRet(t: Type): String = t match
    case Type.TInt     => "ret i64 0"
    case Type.TString  => "ret ptr null"
    case Type.TList(_) => "ret ptr null"

  // === 文字列リテラル ===

  private def addString(s: String): String =
    strPool.getOrElseUpdate(s, {
      strCounter += 1
      val name = s"@.str.$strCounter"
      val enc = encodeBytes(s)
      val totalLen = enc.byteLen + 1
      globalDecls.append(
        s"""$name = private constant [$totalLen x i8] c"${enc.escaped}\\00"\n"""
      )
      name
    })

  private case class EncodedBytes(escaped: String, byteLen: Int)

  private def encodeBytes(s: String): EncodedBytes =
    val sb = StringBuilder()
    val utf8 = s.getBytes("UTF-8")
    for b <- utf8 do
      val c = b & 0xff
      if c >= 0x20 && c <= 0x7e && c != '"'.toInt && c != '\\'.toInt then
        sb.append(c.toChar)
      else
        sb.append(f"\\$c%02X")
    EncodedBytes(sb.toString, utf8.length)

  // === エントリ ===

  def gen(program: Program): Unit =
    funcs = program.funcs.map { f =>
      f.name -> FunSig(f.params, f.retType)
    }.toMap

    program.funcs.foreach(genFunction)
    genMain(program.topStmts)

  private def genMain(stmts: List[Stmt]): Unit =
    regCounter = 0
    labelCounter = 0
    mainBuf.append("define i32 @main() {\n")
    mainBuf.append("entry:\n")
    val env = mutable.Map[String, (String, Type)]()
    val (_, terminated) = genStmts(stmts, env, mainBuf)
    if !terminated then
      mainBuf.append("  ret i32 0\n")
    mainBuf.append("}\n\n")

  private def genFunction(f: FunDef): Unit =
    regCounter = 0
    labelCounter = 0
    val paramStr = f.params.map { case (n, ty) =>
      s"${llvmType(ty)} %arg.$n"
    }.mkString(", ")
    funcDefs.append(s"define ${llvmType(f.retType)} @${f.name}($paramStr) {\n")
    funcDefs.append("entry:\n")
    val env = mutable.Map[String, (String, Type)]()
    f.params.foreach { case (n, ty) =>
      val ptr = s"%$n.addr"
      funcDefs.append(s"  $ptr = alloca ${llvmType(ty)}\n")
      funcDefs.append(s"  store ${llvmType(ty)} %arg.$n, ptr $ptr\n")
      env(n) = (ptr, ty)
    }
    val (_, terminated) = genStmts(f.body, env, funcDefs)
    if !terminated then
      funcDefs.append(s"  ${defaultRet(f.retType)}\n")
    funcDefs.append("}\n\n")

  // === 文の生成 ===
  // returns (updated env, terminated?) — terminated: 末尾の文が return など、その後の合流不要
  private def genStmts(
      stmts: List[Stmt],
      env: mutable.Map[String, (String, Type)],
      buf: StringBuilder
  ): (mutable.Map[String, (String, Type)], Boolean) =
    var terminated = false
    var idx = 0
    while idx < stmts.length && !terminated do
      terminated = genStmt(stmts(idx), env, buf)
      idx += 1
    (env, terminated)

  private def genStmt(
      s: Stmt,
      env: mutable.Map[String, (String, Type)],
      buf: StringBuilder
  ): Boolean =
    s match
      case Stmt.ValDef(name, _, init) =>
        val (v, t) = genExpr(init, env, buf)
        val ptr = s"%$name.addr.${freshSuffix()}"
        buf.append(s"  $ptr = alloca ${llvmType(t)}\n")
        buf.append(s"  store ${llvmType(t)} $v, ptr $ptr\n")
        env(name) = (ptr, t)
        false

      case Stmt.VarDef(name, _, init) =>
        val (v, t) = genExpr(init, env, buf)
        val ptr = s"%$name.addr.${freshSuffix()}"
        buf.append(s"  $ptr = alloca ${llvmType(t)}\n")
        buf.append(s"  store ${llvmType(t)} $v, ptr $ptr\n")
        env(name) = (ptr, t)
        false

      case Stmt.Reassign(name, value) =>
        val (v, _) = genExpr(value, env, buf)
        val (ptr, t) = env(name)
        buf.append(s"  store ${llvmType(t)} $v, ptr $ptr\n")
        false

      case Stmt.IfS(cond, thenBlk, elseBlk) =>
        val (cv, _) = genExpr(cond, env, buf)
        val condBool = freshReg("c")
        buf.append(s"  $condBool = icmp ne i64 $cv, 0\n")
        val thenLbl = freshLabel("then")
        val elseLbl = freshLabel("else")
        val endLbl  = freshLabel("ifend")
        buf.append(s"  br i1 $condBool, label %$thenLbl, label %$elseLbl\n")

        buf.append(s"$thenLbl:\n")
        val (_, thenTerm) = genStmts(thenBlk, env.clone(), buf)
        if !thenTerm then buf.append(s"  br label %$endLbl\n")

        buf.append(s"$elseLbl:\n")
        val (_, elseTerm) = genStmts(elseBlk, env.clone(), buf)
        if !elseTerm then buf.append(s"  br label %$endLbl\n")

        // 両方 terminated でも end ラベルは出す（あとで合流する命令があるとき用）。
        // ただし両方 terminated なら endLbl も到達不能で、後続命令がないと
        // LLVM が困るので unreachable で締める
        if thenTerm && elseTerm then
          buf.append(s"$endLbl:\n")
          buf.append(s"  unreachable\n")
          true
        else
          buf.append(s"$endLbl:\n")
          false

      case Stmt.WhileS(cond, body) =>
        val condLbl = freshLabel("wcond")
        val bodyLbl = freshLabel("wbody")
        val endLbl  = freshLabel("wend")
        buf.append(s"  br label %$condLbl\n")
        buf.append(s"$condLbl:\n")
        val (cv, _) = genExpr(cond, env, buf)
        val condBool = freshReg("c")
        buf.append(s"  $condBool = icmp ne i64 $cv, 0\n")
        buf.append(s"  br i1 $condBool, label %$bodyLbl, label %$endLbl\n")
        buf.append(s"$bodyLbl:\n")
        val (_, bodyTerm) = genStmts(body, env.clone(), buf)
        if !bodyTerm then buf.append(s"  br label %$condLbl\n")
        buf.append(s"$endLbl:\n")
        false

      case Stmt.Print(value) =>
        val (v, t) = genExpr(value, env, buf)
        t match
          case Type.TInt =>
            buf.append(
              s"  call i32 (ptr, ...) @printf(ptr @.fmt.int, i64 $v)\n"
            )
          case Type.TString =>
            buf.append(
              s"  call i32 (ptr, ...) @printf(ptr @.fmt.str, ptr $v)\n"
            )
          case Type.TList(_) =>
            // 簡易実装：要素数情報を持たないので "[list]" とだけ出す
            val ph = addString("[list]")
            buf.append(
              s"  call i32 (ptr, ...) @printf(ptr @.fmt.str, ptr $ph)\n"
            )
        false

      case Stmt.Return(value) =>
        val (v, t) = genExpr(value, env, buf)
        buf.append(s"  ret ${llvmType(t)} $v\n")
        true

      case Stmt.ExprStmt(value) =>
        genExpr(value, env, buf)
        false

  // === 式の生成 ===
  // returns (llvm value, type)
  private def genExpr(
      e: Expr,
      env: mutable.Map[String, (String, Type)],
      buf: StringBuilder
  ): (String, Type) =
    e match
      case Expr.IntLit(v) =>
        (v.toString, Type.TInt)

      case Expr.StrLit(s) =>
        (addString(s), Type.TString)

      case Expr.Var(name) =>
        val (ptr, t) = env(name)
        val r = freshReg("v")
        buf.append(s"  $r = load ${llvmType(t)}, ptr $ptr\n")
        (r, t)

      case Expr.Neg(inner) =>
        val (v, _) = genExpr(inner, env, buf)
        val r = freshReg("neg")
        buf.append(s"  $r = sub i64 0, $v\n")
        (r, Type.TInt)

      case Expr.BinOp(op, l, r) =>
        val (lv, _) = genExpr(l, env, buf)
        val (rv, _) = genExpr(r, env, buf)
        op match
          case "+" =>
            val out = freshReg("b")
            buf.append(s"  $out = add i64 $lv, $rv\n"); (out, Type.TInt)
          case "-" =>
            val out = freshReg("b")
            buf.append(s"  $out = sub i64 $lv, $rv\n"); (out, Type.TInt)
          case "*" =>
            val out = freshReg("b")
            buf.append(s"  $out = mul i64 $lv, $rv\n"); (out, Type.TInt)
          case "/" =>
            val out = freshReg("b")
            buf.append(s"  $out = sdiv i64 $lv, $rv\n"); (out, Type.TInt)
          case "%" =>
            val out = freshReg("b")
            buf.append(s"  $out = srem i64 $lv, $rv\n"); (out, Type.TInt)
          case cmp =>
            val pred = cmp match
              case "==" => "eq"
              case "!=" => "ne"
              case "<"  => "slt"
              case "<=" => "sle"
              case ">"  => "sgt"
              case ">=" => "sge"
              case _    => throw RuntimeException(s"bad op $cmp")
            val bool = freshReg("cmp")
            buf.append(s"  $bool = icmp $pred i64 $lv, $rv\n")
            val ext = freshReg("ext")
            buf.append(s"  $ext = zext i1 $bool to i64\n")
            (ext, Type.TInt)

      case Expr.Call(name, args) =>
        val sig = funcs.getOrElse(
          name,
          throw RuntimeException(s"unknown function: $name")
        )
        val argVals = args.map(a => genExpr(a, env, buf))
        val argStr = argVals.zip(sig.params).map { case ((v, _), (_, ty)) =>
          s"${llvmType(ty)} $v"
        }.mkString(", ")
        val r = freshReg("call")
        buf.append(s"  $r = call ${llvmType(sig.retType)} @$name($argStr)\n")
        (r, sig.retType)

      case Expr.Index(arr, idx) =>
        val (av, at) = genExpr(arr, env, buf)
        val (iv, _)  = genExpr(idx, env, buf)
        val elemTy = at match
          case Type.TList(e) => e
          case _ =>
            throw RuntimeException(s"cannot index non-list: $at")
        val ep = freshReg("ep")
        buf.append(
          s"  $ep = getelementptr ${llvmType(elemTy)}, ptr $av, i64 $iv\n"
        )
        val r = freshReg("elem")
        buf.append(s"  $r = load ${llvmType(elemTy)}, ptr $ep\n")
        (r, elemTy)

      case Expr.ListLit(elems) =>
        if elems.isEmpty then
          throw RuntimeException("empty list not supported")
        val first = genExpr(elems.head, env, buf)
        val elemTy = first._2
        val byteSize = elems.length * 8
        val basePtr = freshReg("list")
        buf.append(s"  $basePtr = call ptr @malloc(i64 $byteSize)\n")
        val ep0 = freshReg("ep")
        buf.append(
          s"  $ep0 = getelementptr ${llvmType(elemTy)}, ptr $basePtr, i64 0\n"
        )
        buf.append(s"  store ${llvmType(elemTy)} ${first._1}, ptr $ep0\n")
        elems.tail.zipWithIndex.foreach { case (e, i) =>
          val (v, _) = genExpr(e, env, buf)
          val ep = freshReg("ep")
          buf.append(
            s"  $ep = getelementptr ${llvmType(elemTy)}, ptr $basePtr, i64 ${i + 1}\n"
          )
          buf.append(s"  store ${llvmType(elemTy)} $v, ptr $ep\n")
        }
        (basePtr, Type.TList(elemTy))

  // === 最終結合 ===

  def result(): String =
    val sb = StringBuilder()
    sb.append("; ModuleID = 'nb-lang'\n")
    sb.append(s"""target triple = "${targetTriple()}"\n\n""")
    sb.append("@.fmt.int = private constant [5 x i8] c\"%ld\\0A\\00\"\n")
    sb.append("@.fmt.str = private constant [4 x i8] c\"%s\\0A\\00\"\n")
    sb.append("declare i32 @printf(ptr, ...)\n")
    sb.append("declare ptr @malloc(i64)\n\n")
    sb.append(globalDecls)
    sb.append("\n")
    sb.append(funcDefs)
    sb.append(mainBuf)
    sb.toString

  private def targetTriple(): String =
    val os = System.getProperty("os.name", "")
    if os.toLowerCase.startsWith("mac") then "arm64-apple-macosx15.0.0"
    else "x86_64-pc-linux-gnu"
