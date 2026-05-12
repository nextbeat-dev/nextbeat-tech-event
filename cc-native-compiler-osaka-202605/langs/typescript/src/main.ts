import { readFileSync, writeFileSync } from "node:fs";

import { tokenize, LexError } from "./lexer.ts";
import { parse, ParseError } from "./parser.ts";
import { check, TypeError as NbTypeError } from "./typecheck.ts";
import { generate } from "./codegen.ts";

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: bun run src/main.ts <input.nb> [-o <output.ll>]");
    process.exit(1);
  }

  const inputPath = args[0]!;
  let outPath: string | undefined;
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === "-o") { outPath = args[i + 1]; break; }
  }
  if (outPath === undefined) {
    outPath = inputPath.endsWith(".nb")
      ? inputPath.slice(0, -3) + ".ll"
      : inputPath + ".ll";
  }

  const source = readFileSync(inputPath, "utf8");
  try {
    const tokens = tokenize(source);
    const program = parse(tokens);
    check(program);
    const ir = generate(program);
    writeFileSync(outPath, ir);
    console.error(`wrote ${outPath}`);
  } catch (e) {
    if (e instanceof LexError) {
      console.error(`lex error: ${e.message}`);
    } else if (e instanceof ParseError) {
      console.error(`parse error: ${e.message}`);
    } else if (e instanceof NbTypeError) {
      console.error(`type error: ${e.message}`);
    } else {
      throw e;
    }
    process.exit(1);
  }
}

main();
