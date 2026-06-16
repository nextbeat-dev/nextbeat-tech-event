/**
 * 簡易CLI（AIに書かせる「道具」層の例）。
 *   pnpm cli "<pattern>" "<input>"        # 全体一致
 *   pnpm cli --search "<pattern>" "<input>"  # 部分一致
 */
import { compile } from "./index.js";

const args = process.argv.slice(2);
const search = args[0] === "--search";
const rest = search ? args.slice(1) : args;
const [pattern, input] = rest;

if (pattern === undefined || input === undefined) {
  console.error('usage: pnpm cli [--search] "<pattern>" "<input>"');
  process.exit(1);
}

const re = compile(pattern);
const matched = search ? re.search(input) : re.test(input);
console.log(`pattern : ${JSON.stringify(pattern)}`);
console.log(`input   : ${JSON.stringify(input)}`);
console.log(`mode    : ${search ? "search(部分一致)" : "test(全体一致)"}`);
console.log(`matched : ${matched}`);
process.exit(matched ? 0 : 1);
