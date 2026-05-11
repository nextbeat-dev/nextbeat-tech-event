package nblang

class TypeError(msg: String) extends RuntimeException(msg)

object TypeCheck:
  case class VarInfo(ty: Type, isMutable: Boolean)
  case class FunSig(params: List[Type], retType: Type)

  def check(program: Program): Unit =
    val funcs: Map[String, FunSig] =
      program.funcs.map { f =>
        f.name -> FunSig(f.params.map(_._2), f.retType)
      }.toMap

    program.funcs.foreach { f =>
      val initEnv: Map[String, VarInfo] = f.params.map { case (name, ty) =>
        name -> VarInfo(ty, isMutable = false)
      }.toMap
      checkStmts(f.body, initEnv, funcs, Some(f.retType))
    }

    checkStmts(program.topStmts, Map.empty, funcs, None)

  private def checkStmts(
      stmts: List[Stmt],
      envIn: Map[String, VarInfo],
      funcs: Map[String, FunSig],
      retTy: Option[Type]
  ): Map[String, VarInfo] =
    var env = envIn
    for s <- stmts do
      env = checkStmt(s, env, funcs, retTy)
    env

  private def checkStmt(
      stmt: Stmt,
      env: Map[String, VarInfo],
      funcs: Map[String, FunSig],
      retTy: Option[Type]
  ): Map[String, VarInfo] =
    stmt match
      case Stmt.ValDef(name, declared, init) =>
        val initTy = checkExpr(init, env, funcs)
        val finalTy = declared match
          case Some(ty) =>
            if !sameType(ty, initTy) then
              throw TypeError(s"val $name: declared $ty but init is $initTy")
            ty
          case None => initTy
        env + (name -> VarInfo(finalTy, isMutable = false))

      case Stmt.VarDef(name, declared, init) =>
        val initTy = checkExpr(init, env, funcs)
        val finalTy = declared match
          case Some(ty) =>
            if !sameType(ty, initTy) then
              throw TypeError(s"var $name: declared $ty but init is $initTy")
            ty
          case None => initTy
        env + (name -> VarInfo(finalTy, isMutable = true))

      case Stmt.Reassign(name, value) =>
        env.get(name) match
          case None =>
            throw TypeError(s"undefined variable: $name")
          case Some(info) =>
            if !info.isMutable then
              throw TypeError(s"cannot reassign val: $name")
            val vt = checkExpr(value, env, funcs)
            if !sameType(info.ty, vt) then
              throw TypeError(s"$name: type ${info.ty} but got $vt")
        env

      case Stmt.IfS(cond, thenBlk, elseBlk) =>
        val ct = checkExpr(cond, env, funcs)
        if ct != Type.TInt then
          throw TypeError(s"if condition must be int (bool), got $ct")
        checkStmts(thenBlk, env, funcs, retTy)
        checkStmts(elseBlk, env, funcs, retTy)
        env

      case Stmt.WhileS(cond, body) =>
        val ct = checkExpr(cond, env, funcs)
        if ct != Type.TInt then
          throw TypeError(s"while condition must be int (bool), got $ct")
        checkStmts(body, env, funcs, retTy)
        env

      case Stmt.Print(value) =>
        checkExpr(value, env, funcs)
        env

      case Stmt.Return(value) =>
        val vt = checkExpr(value, env, funcs)
        retTy match
          case Some(rt) =>
            if !sameType(rt, vt) then
              throw TypeError(s"return type mismatch: expected $rt, got $vt")
          case None =>
            throw TypeError("return outside function")
        env

      case Stmt.ExprStmt(value) =>
        checkExpr(value, env, funcs)
        env

  private def checkExpr(
      e: Expr,
      env: Map[String, VarInfo],
      funcs: Map[String, FunSig]
  ): Type =
    e match
      case Expr.IntLit(_) => Type.TInt
      case Expr.StrLit(_) => Type.TString
      case Expr.Var(name) =>
        env.get(name).map(_.ty).getOrElse(
          throw TypeError(s"undefined variable: $name")
        )
      case Expr.Neg(inner) =>
        val t = checkExpr(inner, env, funcs)
        if t != Type.TInt then
          throw TypeError(s"negation requires int, got $t")
        Type.TInt
      case Expr.BinOp(op, l, r) =>
        val lt = checkExpr(l, env, funcs)
        val rt = checkExpr(r, env, funcs)
        if !sameType(lt, rt) then
          throw TypeError(s"binop $op: type mismatch $lt vs $rt")
        op match
          case "+" | "-" | "*" | "/" | "%" =>
            if lt != Type.TInt then
              throw TypeError(s"arithmetic $op requires int, got $lt")
            Type.TInt
          case "==" | "!=" | "<" | "<=" | ">" | ">=" =>
            if lt != Type.TInt then
              throw TypeError(s"comparison $op requires int, got $lt")
            Type.TInt
          case _ => throw TypeError(s"unknown op: $op")
      case Expr.Call(name, args) =>
        funcs.get(name) match
          case None =>
            throw TypeError(s"undefined function: $name")
          case Some(sig) =>
            if args.length != sig.params.length then
              throw TypeError(
                s"$name: expected ${sig.params.length} args, got ${args.length}"
              )
            args.zip(sig.params).foreach { case (a, pt) =>
              val at = checkExpr(a, env, funcs)
              if !sameType(at, pt) then
                throw TypeError(s"$name: arg type $at, expected $pt")
            }
            sig.retType
      case Expr.Index(arr, idx) =>
        val at = checkExpr(arr, env, funcs)
        val it = checkExpr(idx, env, funcs)
        if it != Type.TInt then
          throw TypeError(s"index must be int, got $it")
        at match
          case Type.TList(elem) => elem
          case _ =>
            throw TypeError(s"cannot index non-list type: $at")
      case Expr.ListLit(elems) =>
        if elems.isEmpty then
          throw TypeError("empty list literal is not supported")
        val first = checkExpr(elems.head, env, funcs)
        elems.tail.foreach { e =>
          val t = checkExpr(e, env, funcs)
          if !sameType(t, first) then
            throw TypeError(s"list literal: mixed types $first and $t")
        }
        Type.TList(first)

  private def sameType(a: Type, b: Type): Boolean =
    (a, b) match
      case (Type.TInt, Type.TInt)             => true
      case (Type.TString, Type.TString)       => true
      case (Type.TList(ea), Type.TList(eb))   => sameType(ea, eb)
      case _                                  => false
