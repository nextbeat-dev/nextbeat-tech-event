package nblang;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public final class Lexer {
    public sealed interface Token permits
            Token.TInt, Token.TStr, Token.TIdent,
            Token.TKw, Token.TOp, Token.TPunct, Token.TEof {
        record TInt(long value) implements Token {}
        record TStr(String value) implements Token {}
        record TIdent(String name) implements Token {}
        record TKw(String name) implements Token {}
        record TOp(String op) implements Token {}
        record TPunct(String sym) implements Token {}
        record TEof() implements Token {}
    }

    public record TokenWithPos(Token token, int line, int col) {}

    public static final class LexError extends RuntimeException {
        public LexError(String msg) { super(msg); }
    }

    private static final Set<String> KEYWORDS = Set.of(
            "val", "var", "if", "else", "while",
            "print", "function", "return",
            "int", "string", "list"
    );

    private static final Set<String> TWO_CHAR_OPS = Set.of("==", "!=", "<=", ">=");

    private final String source;
    private int i = 0;
    private int line = 1;
    private int col = 1;

    private Lexer(String source) {
        this.source = source;
    }

    public static List<TokenWithPos> tokenize(String source) {
        return new Lexer(source).run();
    }

    private void advance() {
        if (source.charAt(i) == '\n') {
            line++;
            col = 1;
        } else {
            col++;
        }
        i++;
    }

    private List<TokenWithPos> run() {
        List<TokenWithPos> result = new ArrayList<>();
        int n = source.length();

        while (i < n) {
            char c = source.charAt(i);
            int startLine = line;
            int startCol = col;

            if (Character.isWhitespace(c)) {
                advance();
            } else if (c == '/' && i + 1 < n && source.charAt(i + 1) == '/') {
                while (i < n && source.charAt(i) != '\n') advance();
            } else if (Character.isDigit(c)) {
                StringBuilder sb = new StringBuilder();
                while (i < n && Character.isDigit(source.charAt(i))) {
                    sb.append(source.charAt(i));
                    advance();
                }
                result.add(new TokenWithPos(new Token.TInt(Long.parseLong(sb.toString())), startLine, startCol));
            } else if (Character.isLetter(c) || c == '_') {
                StringBuilder sb = new StringBuilder();
                while (i < n) {
                    char ch = source.charAt(i);
                    if (Character.isLetterOrDigit(ch) || ch == '_') {
                        sb.append(ch);
                        advance();
                    } else break;
                }
                String name = sb.toString();
                Token tok = KEYWORDS.contains(name) ? new Token.TKw(name) : new Token.TIdent(name);
                result.add(new TokenWithPos(tok, startLine, startCol));
            } else if (c == '"') {
                advance();
                StringBuilder sb = new StringBuilder();
                while (i < n && source.charAt(i) != '"') {
                    if (source.charAt(i) == '\\' && i + 1 < n) {
                        advance();
                        char esc = source.charAt(i);
                        switch (esc) {
                            case 'n'  -> { sb.append('\n'); advance(); }
                            case '"'  -> { sb.append('"');  advance(); }
                            case '\\' -> { sb.append('\\'); advance(); }
                            case 't'  -> { sb.append('\t'); advance(); }
                            default   -> throw new LexError(
                                    "unknown escape: \\" + esc + " at line " + line + " col " + col);
                        }
                    } else {
                        sb.append(source.charAt(i));
                        advance();
                    }
                }
                if (i >= n) throw new LexError("unterminated string at line " + startLine);
                advance(); // closing quote
                result.add(new TokenWithPos(new Token.TStr(sb.toString()), startLine, startCol));
            } else {
                String twoChar = (i + 1 < n) ? source.substring(i, i + 2) : "";
                if (TWO_CHAR_OPS.contains(twoChar)) {
                    result.add(new TokenWithPos(new Token.TOp(twoChar), startLine, startCol));
                    advance();
                    advance();
                } else {
                    switch (c) {
                        case '+', '-', '*', '/', '%', '<', '>' -> {
                            result.add(new TokenWithPos(new Token.TOp(String.valueOf(c)), startLine, startCol));
                            advance();
                        }
                        case '=' -> {
                            result.add(new TokenWithPos(new Token.TOp("="), startLine, startCol));
                            advance();
                        }
                        case '(', ')', '{', '}', '[', ']', ',', ';', ':' -> {
                            result.add(new TokenWithPos(new Token.TPunct(String.valueOf(c)), startLine, startCol));
                            advance();
                        }
                        default -> throw new LexError(
                                "unexpected character '" + c + "' at line " + line + " col " + col);
                    }
                }
            }
        }

        result.add(new TokenWithPos(new Token.TEof(), line, col));
        return result;
    }
}
