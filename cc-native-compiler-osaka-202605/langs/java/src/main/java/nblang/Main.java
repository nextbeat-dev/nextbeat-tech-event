package nblang;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import nblang.Ast.Program;
import nblang.Lexer.TokenWithPos;

public final class Main {
    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            System.err.println("Usage: mvn -q compile exec:java -Dexec.args=\"<input.nb> [-o <output.ll>]\"");
            System.exit(1);
        }

        String inputPath = args[0];
        String outPath = null;
        for (int i = 0; i < args.length - 1; i++) {
            if (args[i].equals("-o")) { outPath = args[i + 1]; break; }
        }
        if (outPath == null) {
            outPath = inputPath.endsWith(".nb")
                    ? inputPath.substring(0, inputPath.length() - 3) + ".ll"
                    : inputPath + ".ll";
        }

        String source = Files.readString(Path.of(inputPath));
        try {
            List<TokenWithPos> tokens = Lexer.tokenize(source);
            Program program = Parser.parse(tokens);
            TypeCheck.check(program);
            String ir = CodeGen.generate(program);
            Files.writeString(Path.of(outPath), ir);
            System.err.println("wrote " + outPath);
        } catch (Lexer.LexError e) {
            System.err.println("lex error: " + e.getMessage());
            System.exit(1);
        } catch (Parser.ParseError e) {
            System.err.println("parse error: " + e.getMessage());
            System.exit(1);
        } catch (TypeCheck.TypeError e) {
            System.err.println("type error: " + e.getMessage());
            System.exit(1);
        }
    }
}
