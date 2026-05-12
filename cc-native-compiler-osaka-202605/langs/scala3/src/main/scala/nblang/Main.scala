package nblang

import java.nio.file.{Files, Paths}

object Main:
  def main(args: Array[String]): Unit =
    if args.isEmpty then
      Console.err.println("Usage: scala-cli run . -- <input.nb> [-o <output.ll>]")
      sys.exit(1)

    val inputPath = args(0)
    val outPath =
      val idx = args.indexOf("-o")
      if idx >= 0 && idx + 1 < args.length then args(idx + 1)
      else inputPath.stripSuffix(".nb") + ".ll"

    val source = scala.io.Source.fromFile(inputPath).mkString
    try
      val tokens  = Lexer.tokenize(source)
      val program = Parser.parse(tokens)
      TypeCheck.check(program)
      val ir = CodeGen.generate(program)
      Files.writeString(Paths.get(outPath), ir)
      Console.err.println(s"wrote $outPath")
    catch
      case e: LexError =>
        Console.err.println(s"lex error: ${e.getMessage}")
        sys.exit(1)
      case e: ParseError =>
        Console.err.println(s"parse error: ${e.getMessage}")
        sys.exit(1)
      case e: TypeError =>
        Console.err.println(s"type error: ${e.getMessage}")
        sys.exit(1)
