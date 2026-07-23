# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Hands-on workshop material ("Nextbeat Osaka Lab #1 — Claude Codeで作る、正規表現エンジン",
connpass #397529, 2026-07-23 19:00-21:00, 大阪オフィス, 定員4名) that builds a ReDoS-proof regex
engine in TypeScript using **Brzozowski derivatives**. It is a teaching artifact, not a library
meant for production consumption — every file's comments are written to explain the *design* to
workshop participants, so preserve that documentation style when editing.

`main` is the instructor reference (complete solution). Participants work from a `start` branch
(not present in this local checkout; created from `main` after this feature branch merges) where
two files are deliberately weakened:
- `src/derivative.ts` — `nullable`/`derivative` are reduced to a **switch skeleton with
  `default: throw new Error("TODO(山場①): ...")`**; the docstrings (rule tables, the `a?b` trap
  note) stay intact so the AI/participant has the same spec context as `main`. `classMatches`
  is left complete.
- `src/normalize.ts` — `mkAlt`/`mkConcat`/`mkStar` are a **naive implementation** (each just
  builds the raw `{tag: ..., ...}` node, no ACI logic), *not* a throw/TODO stub. This is
  intentional: `derivative.ts` and `parser.ts` both call these constructors during desugaring, so
  a throwing stub here would break step ① before it can even start. The naive version is
  semantically correct — only unbounded (state count grows without normalization), which is
  exactly the "works but explodes" state that motivates step ② (ACI normalization).
When asked to "reset to the exercise state" or similar, that means restoring these two files to
the above shapes — check `SPEC.md` and `AGENT_PROMPTS.md` for the exact scope expected of each
blank.

## Commands

```bash
pnpm install
pnpm test                 # vitest run tests/spec.test.ts — stage1 (semantics), 27 tests
pnpm test:all             # stage1 + tests/linear.test.ts — stage2 (linearity/state-count), 2 tests
pnpm test:watch           # vitest watch mode (stage1 only, tests/spec.test.ts)
pnpm cli '[a-z]+@[a-z]+' 'foo@bar'      # full match (test)
pnpm cli --search 'ab' 'xxabxx'          # substring match (search)
pnpm bench:redos 28       # native RegExp vs this engine on a ReDoS pattern; arg = attack length
pnpm bench:linear         # proves O(n): runs (a+)+ over 10^4..10^7 chars, prints state count
```

Tests are split into two files/stages on purpose: `tests/spec.test.ts` (stage1, semantics — the
step-① completion signal) and `tests/linear.test.ts` (stage2, state-count convergence over a
100k-char attack string — the step-② completion signal). Before ② is done, `pnpm test:all` is
*expected* to fail with a readable "state count exceeds threshold" assertion (not a hang) because
`tests/linear.test.ts` gates the 100k-char assertion behind a 12-char state-count check first —
without that gate, an un-normalized engine would blow up synchronously on the 100k input before
vitest's timeout could ever interrupt it. `pnpm test` (stage1 only) is what participants watch go
green after step ①; `pnpm test:all` is the true "both steps done" signal.

`bench/redos.ts` and `bench/linear.ts` both have safety devices so a participant can't freeze/OOM
their own laptop by exploring: (1) attack lengths `n > 30` require an explicit `--force` flag
(native `RegExp` on `(a+)+` roughly doubles per +1 char past that point, so an un-guarded n=32+
run is minutes of a frozen native regex); (2) before the real measurement, both benches run a
12-char probe against the participant's own engine and check `stateCount()` — if it's already
exploding (i.e. step ② / ACI normalization isn't done yet), they print an explanatory message
("状態爆発を検知...②へ") and bail out instead of letting the un-normalized engine's exponential
blowup run to completion.

There is no lint script and no build/emit step (`tsconfig.json` has `noEmit: true`); `tsx` runs
TS directly. To run a single test, use vitest's normal filtering, e.g.
`pnpm exec vitest run -t "a?b"`.

Node >=20, pnpm >=9 required (see `engines` in `package.json`).

## Architecture

The engine is derivative-based (Brzozowski, 1964), not NFA/backtracking. Two ~15-line pure
functions (`nullable`, `derivative` in `src/derivative.ts`) are the entire matching core; a
"lazy DFA" falls out of memoizing `derivative` results. Data flow:

```
pattern string --parser.ts--> Re (AST) --match.ts (LazyDfa)--> boolean
                                  ^
                          normalize.ts (mkAlt/mkConcat/mkStar)
```

- **`src/ast.ts`** — the `Re` union type, intentionally minimal: `Empty | Eps | Class | Concat | Alt | Star`.
  Everything else (`+ ? {n,m} ( )`) desugars into this core in the parser. Also owns
  `canonicalKey`, the structural string used to dedupe/identify states — never use object
  identity or a raw object literal as a Map key for `Re` nodes.
- **`src/derivative.ts`** — `nullable(r)` (does `r` accept `""`) and `derivative(r, c)` (the regex
  matching what's left after consuming char `c`). The one non-obvious rule: for `Concat(r, s)`,
  $\partial_c(rs) = \partial_c(r)\cdot s \mid (\text{nullable}(r)\;?\;\partial_c(s):\emptyset)$ — the `nullable(r)` term is easy to drop and only
  breaks patterns like `a?b` (left side can match empty), which is why
  `tests/spec.test.ts` has a dedicated "a?b トラップ" test — other cases keep passing even when
  this is wrong.
- **`src/normalize.ts`** — smart constructors (`mkAlt`, `mkConcat`, `mkStar`) that keep the state
  space finite. Without ACI normalization (absorption/commutativity/idempotence + associative
  flattening), repeated derivation blows up state count exponentially (e.g. `(a+)+`). All new
  `Re` nodes must be constructed through these functions, never as raw object literals — that's
  what keeps `canonicalKey`-based state interning correct in `LazyDfa`.
- **`src/match.ts`** — `fullMatch` (naive, re-derives every step) and `LazyDfa` (memoizes
  `(stateId, char) -> nextStateId` on first use, i.e. builds a DFA on demand). `toSearch` reduces
  substring search to full match by wrapping with `.* re .*`.
- **`src/parser.ts`** — recursive-descent parser, pattern string → `Re`. Precedence: `|` < concat
  < postfix quantifier < atom. Desugars $r^+ \to r\cdot r^*$, $r^? \to r\mid\varepsilon$, and now also `{n,m}` (`r{n}`,
  `r{n,}`, `r{n,m}` all desugar into the same core via repeated `mkConcat`/`mkAlt`, matching
  `SPEC.md`'s claim that these are sugar, not new AST). Unsupported syntax participants might
  bring in (`^` `$`, unknown letter escapes like `\b \B \D \W \S`, `\1`-style backreferences,
  `(?...)` extended groups, a bare unmatched `{`) is rejected with a dedicated, actionable
  `SyntaxError` rather than silently mis-parsed as literal characters — this was a deliberate fix
  because the old silent-fallback behavior meant a participant's own regex could look like it
  "just doesn't match" with no indication why, which undermines the workshop's "bring your own
  regex" segment. Non-greedy suffixes (`*?`, `+?`, `??`) are accepted and skipped over — greediness
  doesn't change what a DFA accepts, only backtracking order, so treating them as no-ops is
  correct, not a punt. This is deliberately the "throwaway" layer meant to be delegated wholesale
  to an AI agent during the workshop — unlike the derivative/normalize core, correctness here
  isn't the pedagogical point.
- **`src/index.ts`** — public API (`compile(pattern)` -> `{ test, search, stateCount }`), plus
  re-exports of internals for participants to poke at directly.

**Deliberate scope limit:** no backreferences (`\1`). They exceed regular-language expressive
power and cannot be represented in a DFA — the whole point of the exercise is that linear-time /
ReDoS-immunity is a direct consequence of what's *excluded* from the design (see end of `SPEC.md`).

## Key docs to read before making non-trivial changes

- **`SPEC.md`** — the actual design spec (nullable/derivative rule tables, normalization rules).
  Code and spec are meant to correspond 1:1; if you change matching semantics, update this file
  too.
- **`AGENT_PROMPTS.md`** — fixed prompts used live during the workshop to regenerate
  `derivative.ts`, `normalize.ts`, and `parser.ts` from `SPEC.md`. If you're asked to "redo the
  core implementation from spec," these are the canonical prompts — don't improvise new ones.
