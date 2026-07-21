/**
 * 簡易CLI（AIに書かせる「道具」層の例）。
 *   pnpm cli '<pattern>' '<input>'          # 全体一致
 *   pnpm cli --search '<pattern>' '<input>' # 部分一致
 *
 * 注意: パターンは必ずシングルクォートで囲むこと。[ ] ( ) + | などは
 *       シェル（zsh/bash）が先に解釈してしまう。
 */
import { compile } from "./index.js";

const args = process.argv.slice(2);
const search = args[0] === "--search";
const rest = search ? args.slice(1) : args;
const [pattern, input] = rest;

if (pattern === undefined || input === undefined) {
  console.error("usage: pnpm cli [--search] '<pattern>' '<input>'");
  process.exit(2);
}

let matched: boolean;
try {
  const re = compile(pattern);
  matched = search ? re.search(input) : re.test(input);
} catch (e) {
  if (e instanceof SyntaxError) {
    console.error(`パターンエラー: ${e.message}`);
    process.exit(2);
  }
  throw e;
}

console.log(`pattern : ${JSON.stringify(pattern)}`);
console.log(`input   : ${JSON.stringify(input)}`);
console.log(`mode    : ${search ? "search(部分一致)" : "test(全体一致)"}`);
console.log(`matched : ${matched}`);
if (!matched && !search) {
  console.log("hint    : 全体一致(test)なので ^ や $ は不要（外してある前提）。部分一致は --search を使う");
}
process.exit(matched ? 0 : 1);
