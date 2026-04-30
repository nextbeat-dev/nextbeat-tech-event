package nblang

class Parser(tokens: List[Token]):
  private var pos = 0

  private def peek: Token = tokens(pos)

  private def consume(): Token =
    val t = tokens(pos)
    pos += 1
    t

  private def expect(t: Token): Token =
    val cur = consume()
    if cur != t then
      throw new RuntimeException(s"Expected $t but got $cur at position ${pos - 1}")
    cur

  def parseProgram(): List[Stmt] =
    val stmts = scala.collection.mutable.ListBuffer[Stmt]()
    while peek != Token.EOF do
      stmts += parseStmt()
    stmts.toList

  private def parseStmt(): Stmt =
    peek match
      case Token.KwVal    => parseValDef()
      case Token.KwVar    => parseVarDef()
      case Token.KwIf     => parseIf()
      case Token.KwWhile  => parseWhile()
      case Token.KwPrint  => parsePrint()
      case Token.Ident(_) => parseReassign()
      case t              => throw new RuntimeException(s"Unexpected token: $t")

  private def parseValDef(): Stmt =
    expect(Token.KwVal)
    val name = consumeIdent()
    expect(Token.Op("="))
    val init = parseExpr()
    expect(Token.Semi)
    Stmt.ValDef(name, init)

  private def parseVarDef(): Stmt =
    expect(Token.KwVar)
    val name = consumeIdent()
    expect(Token.Op("="))
    val init = parseExpr()
    expect(Token.Semi)
    Stmt.VarDef(name, init)

  private def parseReassign(): Stmt =
    val name = consumeIdent()
    expect(Token.Op("="))
    val value = parseExpr()
    expect(Token.Semi)
    Stmt.Reassign(name, value)

  private def parseIf(): Stmt =
    expect(Token.KwIf)
    expect(Token.LParen)
    val cond = parseExpr()
    expect(Token.RParen)
    val thenBlk = parseBlock()
    val elseBlk =
      if peek == Token.KwElse then
        consume()
        parseBlock()
      else List()
    Stmt.If(cond, thenBlk, elseBlk)

  private def parseWhile(): Stmt =
    expect(Token.KwWhile)
    expect(Token.LParen)
    val cond = parseExpr()
    expect(Token.RParen)
    val body = parseBlock()
    Stmt.While(cond, body)

  private def parsePrint(): Stmt =
    expect(Token.KwPrint)
    expect(Token.LParen)
    val v = parseExpr()
    expect(Token.RParen)
    expect(Token.Semi)
    Stmt.Print(v)

  private def parseBlock(): List[Stmt] =
    expect(Token.LBrace)
    val stmts = scala.collection.mutable.ListBuffer[Stmt]()
    while peek != Token.RBrace do
      stmts += parseStmt()
    expect(Token.RBrace)
    stmts.toList

  // expr = comparison
  private def parseExpr(): Expr = parseComparison()

  private def parseComparison(): Expr =
    var left = parseAdditive()
    while isCmpOp(peek) do
      val op = peek.asInstanceOf[Token.Op].s
      consume()
      val right = parseAdditive()
      left = Expr.BinOp(op, left, right)
    left

  private def parseAdditive(): Expr =
    var left = parseMultiplicative()
    while isAddOp(peek) do
      val op = peek.asInstanceOf[Token.Op].s
      consume()
      val right = parseMultiplicative()
      left = Expr.BinOp(op, left, right)
    left

  private def parseMultiplicative(): Expr =
    var left = parsePrimary()
    while isMulOp(peek) do
      val op = peek.asInstanceOf[Token.Op].s
      consume()
      val right = parsePrimary()
      left = Expr.BinOp(op, left, right)
    left

  private def parsePrimary(): Expr =
    consume() match
      case Token.IntT(v)  => Expr.IntLit(v)
      case Token.Ident(s) => Expr.Var(s)
      case Token.LParen =>
        val e = parseExpr()
        expect(Token.RParen)
        e
      case t => throw new RuntimeException(s"Expected primary, got $t")

  private def consumeIdent(): String =
    consume() match
      case Token.Ident(s) => s
      case t              => throw new RuntimeException(s"Expected identifier, got $t")

  private def isCmpOp(t: Token): Boolean = t match
    case Token.Op(s) => Set("==", "!=", "<", "<=", ">", ">=").contains(s)
    case _           => false

  private def isAddOp(t: Token): Boolean = t match
    case Token.Op("+") | Token.Op("-") => true
    case _                             => false

  private def isMulOp(t: Token): Boolean = t match
    case Token.Op("*") | Token.Op("/") | Token.Op("%") => true
    case _                                              => false
