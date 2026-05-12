package nblang

enum Token:
  case TInt(v: Long)
  case TStr(s: String)
  case TIdent(s: String)
  case TKw(s: String)
  case TOp(s: String)
  case TPunct(s: String)
  case TEof

case class TokenWithPos(token: Token, line: Int, col: Int)

class LexError(msg: String) extends RuntimeException(msg)

object Lexer:
  private val Keywords = Set(
    "val", "var", "if", "else", "while",
    "print", "function", "return",
    "int", "string", "list"
  )

  def tokenize(source: String): List[TokenWithPos] =
    val result = scala.collection.mutable.ListBuffer[TokenWithPos]()
    var i = 0
    var line = 1
    var col = 1
    val n = source.length

    def advance(): Unit =
      if source(i) == '\n' then { line += 1; col = 1 } else col += 1
      i += 1

    while i < n do
      val c = source(i)
      val startLine = line
      val startCol = col

      if c.isWhitespace then
        advance()
      else if c == '/' && i + 1 < n && source(i + 1) == '/' then
        while i < n && source(i) != '\n' do advance()
      else if c.isDigit then
        val sb = StringBuilder()
        while i < n && source(i).isDigit do
          sb.append(source(i))
          advance()
        result += TokenWithPos(Token.TInt(sb.toString.toLong), startLine, startCol)
      else if c.isLetter || c == '_' then
        val sb = StringBuilder()
        while i < n && (source(i).isLetterOrDigit || source(i) == '_') do
          sb.append(source(i))
          advance()
        val name = sb.toString
        val tok =
          if Keywords.contains(name) then Token.TKw(name)
          else Token.TIdent(name)
        result += TokenWithPos(tok, startLine, startCol)
      else if c == '"' then
        advance() // opening
        val sb = StringBuilder()
        while i < n && source(i) != '"' do
          if source(i) == '\\' && i + 1 < n then
            advance()
            source(i) match
              case 'n'  => sb.append('\n'); advance()
              case '"'  => sb.append('"'); advance()
              case '\\' => sb.append('\\'); advance()
              case 't'  => sb.append('\t'); advance()
              case other =>
                throw LexError(s"unknown escape: \\$other at line $line col $col")
          else
            sb.append(source(i))
            advance()
        if i >= n then throw LexError(s"unterminated string at line $startLine")
        advance() // closing
        result += TokenWithPos(Token.TStr(sb.toString), startLine, startCol)
      else
        val twoChar = if i + 1 < n then source.substring(i, i + 2) else ""
        if Set("==", "!=", "<=", ">=").contains(twoChar) then
          result += TokenWithPos(Token.TOp(twoChar), startLine, startCol)
          advance(); advance()
        else
          c match
            case '+' | '-' | '*' | '/' | '%' | '<' | '>' =>
              result += TokenWithPos(Token.TOp(c.toString), startLine, startCol)
              advance()
            case '=' =>
              result += TokenWithPos(Token.TOp("="), startLine, startCol)
              advance()
            case '(' | ')' | '{' | '}' | '[' | ']' | ',' | ';' | ':' =>
              result += TokenWithPos(Token.TPunct(c.toString), startLine, startCol)
              advance()
            case _ =>
              throw LexError(s"unexpected character '$c' at line $line col $col")

    result += TokenWithPos(Token.TEof, line, col)
    result.toList
