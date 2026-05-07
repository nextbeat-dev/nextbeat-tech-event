//> using scala 3.5
//> using jvm 21

package nblang

import scala.io.Source

@main def nbLangCompile(args: String*): Unit =
  if args.isEmpty then
    Console.err.println("usage: scala-cli run . -- <source.nb>")
    sys.exit(1)
  val src     = Source.fromFile(args.head).mkString
  val tokens  = Lexer.tokenize(src)
  val parser  = new Parser(tokens)
  val program = parser.parseProgram()
  val codegen = new CodeGen()
  val ir      = codegen.gen(program)
  print(ir)
