package nblang

import Token.*

class ParseError(msg: String) extends RuntimeException(msg)

class Parser(tokens: List[TokenWithPos]):
  private var pos = 0
  private val toks = tokens.toIndexedSeq

  private def peek: Token = toks(pos).token
  private def lineOf: Int = toks(pos).line

  private def advance(): Token =
    val t = toks(pos).token
    if t != TEof then pos += 1
    t

  private def expectPunct(s: String): Unit =
    peek match
      case TPunct(`s`) => advance()
      case other =>
        throw ParseError(s"expected '$s' but got $other at line $lineOf")

  private def expectOp(s: String): Unit =
    peek match
      case TOp(`s`) => advance()
      case other =>
        throw ParseError(s"expected '$s' but got $other at line $lineOf")

  private def expectKw(s: String): Unit =
    peek match
      case TKw(`s`) => advance()
      case other =>
        throw ParseError(s"expected keyword '$s' but got $other at line $lineOf")

  private def expectIdent(): String =
    peek match
      case TIdent(n) => advance(); n
      case other =>
        throw ParseError(s"expected identifier but got $other at line $lineOf")

  def parseProgram(): Program =
    val funcs = scala.collection.mutable.ListBuffer[FunDef]()
    val stmts = scala.collection.mutable.ListBuffer[Stmt]()
    while peek != TEof do
      peek match
        case TKw("function") => funcs += parseFunction()
        case _               => stmts += parseStatement()
    Program(funcs.toList, stmts.toList)

  private def parseFunction(): FunDef =
    expectKw("function")
    val name = expectIdent()
    expectPunct("(")
    val params = scala.collection.mutable.ListBuffer[(String, Type)]()
    if peek != TPunct(")") then
      params += parseParam()
      while peek == TPunct(",") do
        advance()
        params += parseParam()
    expectPunct(")")
    expectPunct(":")
    val retTy = parseType()
    val body = parseBlock()
    FunDef(name, params.toList, retTy, body)

  private def parseParam(): (String, Type) =
    val name = expectIdent()
    expectPunct(":")
    val ty = parseType()
    (name, ty)

  private def parseType(): Type =
    peek match
      case TKw("int")    => advance(); Type.TInt
      case TKw("string") => advance(); Type.TString
      case TKw("list") =>
        advance()
        expectOp("<")
        val elem = parseType()
        expectOp(">")
        Type.TList(elem)
      case other =>
        throw ParseError(s"expected type but got $other at line $lineOf")

  private def parseBlock(): List[Stmt] =
    expectPunct("{")
    val stmts = scala.collection.mutable.ListBuffer[Stmt]()
    while peek != TPunct("}") do
      stmts += parseStatement()
    expectPunct("}")
    stmts.toList

  private def parseStatement(): Stmt =
    peek match
      case TKw("val")    => parseValDef()
      case TKw("var")    => parseVarDef()
      case TKw("if")     => parseIf()
      case TKw("while")  => parseWhile()
      case TKw("print")  => parsePrint()
      case TKw("return") => parseReturn()
      case TIdent(_) =>
        if pos + 1 < toks.length && toks(pos + 1).token == TOp("=") then
          parseReassign()
        else
          parseExprStmt()
      case _ => parseExprStmt()

  private def parseValDef(): Stmt =
    expectKw("val")
    val name = expectIdent()
    val ty =
      if peek == TPunct(":") then
        advance(); Some(parseType())
      else None
    expectOp("=")
    val init = parseExpr()
    expectPunct(";")
    Stmt.ValDef(name, ty, init)

  private def parseVarDef(): Stmt =
    expectKw("var")
    val name = expectIdent()
    val ty =
      if peek == TPunct(":") then
        advance(); Some(parseType())
      else None
    expectOp("=")
    val init = parseExpr()
    expectPunct(";")
    Stmt.VarDef(name, ty, init)

  private def parseReassign(): Stmt =
    val name = expectIdent()
    expectOp("=")
    val value = parseExpr()
    expectPunct(";")
    Stmt.Reassign(name, value)

  private def parseIf(): Stmt =
    expectKw("if")
    expectPunct("(")
    val cond = parseExpr()
    expectPunct(")")
    val thenBlk = parseBlock()
    val elseBlk =
      if peek == TKw("else") then
        advance(); parseBlock()
      else List.empty
    Stmt.IfS(cond, thenBlk, elseBlk)

  private def parseWhile(): Stmt =
    expectKw("while")
    expectPunct("(")
    val cond = parseExpr()
    expectPunct(")")
    val body = parseBlock()
    Stmt.WhileS(cond, body)

  private def parsePrint(): Stmt =
    expectKw("print")
    expectPunct("(")
    val value = parseExpr()
    expectPunct(")")
    expectPunct(";")
    Stmt.Print(value)

  private def parseReturn(): Stmt =
    expectKw("return")
    val value = parseExpr()
    expectPunct(";")
    Stmt.Return(value)

  private def parseExprStmt(): Stmt =
    val expr = parseExpr()
    expectPunct(";")
    Stmt.ExprStmt(expr)

  // === Expressions ===

  private def parseExpr(): Expr = parseComparison()

  private val cmpOps = Set("==", "!=", "<", "<=", ">", ">=")

  private def parseComparison(): Expr =
    var left = parseAdditive()
    var continue = true
    while continue do
      peek match
        case TOp(op) if cmpOps.contains(op) =>
          advance()
          val right = parseAdditive()
          left = Expr.BinOp(op, left, right)
        case _ => continue = false
    left

  private def parseAdditive(): Expr =
    var left = parseMultiplicative()
    var continue = true
    while continue do
      peek match
        case TOp(op) if op == "+" || op == "-" =>
          advance()
          val right = parseMultiplicative()
          left = Expr.BinOp(op, left, right)
        case _ => continue = false
    left

  private def parseMultiplicative(): Expr =
    var left = parseUnary()
    var continue = true
    while continue do
      peek match
        case TOp(op) if op == "*" || op == "/" || op == "%" =>
          advance()
          val right = parseUnary()
          left = Expr.BinOp(op, left, right)
        case _ => continue = false
    left

  private def parseUnary(): Expr =
    if peek == TOp("-") then
      advance()
      Expr.Neg(parsePostfix())
    else
      parsePostfix()

  private def parsePostfix(): Expr =
    var e = parsePrimary()
    var continue = true
    while continue do
      peek match
        case TPunct("(") =>
          e match
            case Expr.Var(name) =>
              advance()
              val args = scala.collection.mutable.ListBuffer[Expr]()
              if peek != TPunct(")") then
                args += parseExpr()
                while peek == TPunct(",") do
                  advance()
                  args += parseExpr()
              expectPunct(")")
              e = Expr.Call(name, args.toList)
            case _ => continue = false
        case TPunct("[") =>
          advance()
          val idx = parseExpr()
          expectPunct("]")
          e = Expr.Index(e, idx)
        case _ => continue = false
    e

  private def parsePrimary(): Expr =
    peek match
      case TInt(v)   => advance(); Expr.IntLit(v)
      case TStr(s)   => advance(); Expr.StrLit(s)
      case TIdent(n) => advance(); Expr.Var(n)
      case TPunct("(") =>
        advance()
        val e = parseExpr()
        expectPunct(")")
        e
      case TPunct("[") =>
        advance()
        val elems = scala.collection.mutable.ListBuffer[Expr]()
        if peek != TPunct("]") then
          elems += parseExpr()
          while peek == TPunct(",") do
            advance()
            elems += parseExpr()
        expectPunct("]")
        Expr.ListLit(elems.toList)
      case other =>
        throw ParseError(s"unexpected token $other at line $lineOf")

object Parser:
  def parse(tokens: List[TokenWithPos]): Program =
    Parser(tokens).parseProgram()
