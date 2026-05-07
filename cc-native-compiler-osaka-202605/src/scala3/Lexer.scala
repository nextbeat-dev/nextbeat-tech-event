package nblang

enum Token:
  case IntT(v: Long)
  case Ident(s: String)
  case KwVal, KwVar, KwIf, KwElse, KwWhile, KwPrint
  case Op(s: String)
  case LParen, RParen, LBrace, RBrace, Semi, EOF

object Lexer:
  def tokenize(src: String): List[Token] =
    val buf = scala.collection.mutable.ListBuffer[Token]()
    var i = 0
    val n = src.length

    while i < n do
      val c = src(i)
      if c.isWhitespace then
        i += 1
      else if c == '/' && i + 1 < n && src(i + 1) == '/' then
        while i < n && src(i) != '\n' do i += 1
      else if c.isDigit then
        var j = i
        while j < n && src(j).isDigit do j += 1
        buf += Token.IntT(src.substring(i, j).toLong)
        i = j
      else if c.isLetter || c == '_' then
        var j = i
        while j < n && (src(j).isLetterOrDigit || src(j) == '_') do j += 1
        val word = src.substring(i, j)
        buf += (word match
          case "val"   => Token.KwVal
          case "var"   => Token.KwVar
          case "if"    => Token.KwIf
          case "else"  => Token.KwElse
          case "while" => Token.KwWhile
          case "print" => Token.KwPrint
          case _       => Token.Ident(word))
        i = j
      else if c == '(' then { buf += Token.LParen; i += 1 }
      else if c == ')' then { buf += Token.RParen; i += 1 }
      else if c == '{' then { buf += Token.LBrace; i += 1 }
      else if c == '}' then { buf += Token.RBrace; i += 1 }
      else if c == ';' then { buf += Token.Semi;   i += 1 }
      else if c == '=' && i + 1 < n && src(i + 1) == '=' then { buf += Token.Op("=="); i += 2 }
      else if c == '!' && i + 1 < n && src(i + 1) == '=' then { buf += Token.Op("!="); i += 2 }
      else if c == '<' && i + 1 < n && src(i + 1) == '=' then { buf += Token.Op("<="); i += 2 }
      else if c == '>' && i + 1 < n && src(i + 1) == '=' then { buf += Token.Op(">="); i += 2 }
      else if c == '<' then { buf += Token.Op("<");  i += 1 }
      else if c == '>' then { buf += Token.Op(">");  i += 1 }
      else if c == '=' then { buf += Token.Op("=");  i += 1 }
      else if "+-*/%".contains(c) then { buf += Token.Op(c.toString); i += 1 }
      else throw new RuntimeException(s"Unknown char: '$c' at position $i")

    buf += Token.EOF
    buf.toList
