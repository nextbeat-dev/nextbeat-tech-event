import { describe, it, expect } from "vitest";
import { compile } from "../src/index.js";

// 全体一致(test)のヘルパ
const m = (pattern: string, input: string) => compile(pattern).test(input);

describe("連接", () => {
  it("ab", () => {
    expect(m("ab", "ab")).toBe(true);
    expect(m("ab", "a")).toBe(false);
    expect(m("ab", "abc")).toBe(false);
    expect(m("ab", "")).toBe(false);
  });
});

describe("選択 |", () => {
  it("a|b", () => {
    expect(m("a|b", "a")).toBe(true);
    expect(m("a|b", "b")).toBe(true);
    expect(m("a|b", "c")).toBe(false);
    expect(m("a|b", "")).toBe(false);
  });
});

describe("星 *", () => {
  it("a*", () => {
    expect(m("a*", "")).toBe(true);
    expect(m("a*", "a")).toBe(true);
    expect(m("a*", "aaaa")).toBe(true);
    expect(m("a*", "b")).toBe(false);
  });
  it("(ab)*", () => {
    expect(m("(ab)*", "")).toBe(true);
    expect(m("(ab)*", "ab")).toBe(true);
    expect(m("(ab)*", "abab")).toBe(true);
    expect(m("(ab)*", "aba")).toBe(false);
  });
});

describe("量化子 + ?", () => {
  it("a+", () => {
    expect(m("a+", "")).toBe(false);
    expect(m("a+", "a")).toBe(true);
    expect(m("a+", "aaa")).toBe(true);
  });

  // ★連接則の罠: ∂c(rs) で nullable(r) のとき ∂c(s) を足し忘れると、
  //   この「左がεを含む連接」だけが壊れる（他のテストは通るので発見が遅れる）。
  it("a?b （連接 nullable 項のトラップ）", () => {
    expect(m("a?b", "b")).toBe(true); // a を0回 → b
    expect(m("a?b", "ab")).toBe(true); // a を1回 → ab
    expect(m("a?b", "aab")).toBe(false);
    expect(m("a?b", "a")).toBe(false);
    expect(m("a?b", "")).toBe(false);
  });
});

describe("文字クラス", () => {
  it("[a-z]+", () => {
    expect(m("[a-z]+", "abc")).toBe(true);
    expect(m("[a-z]+", "z")).toBe(true);
    expect(m("[a-z]+", "")).toBe(false);
    expect(m("[a-z]+", "aZ")).toBe(false);
  });
  it("[^0-9] （1文字・否定クラス）", () => {
    expect(m("[^0-9]", "a")).toBe(true);
    expect(m("[^0-9]", "5")).toBe(false);
    expect(m("[^0-9]", "")).toBe(false);
  });
  it("\\d+", () => {
    expect(m("\\d+", "123")).toBe(true);
    expect(m("\\d+", "12a")).toBe(false);
  });
});

describe("ドット . （改行以外の任意1文字）", () => {
  it(".", () => {
    expect(m(".", "a")).toBe(true);
    expect(m(".", "")).toBe(false);
    expect(m(".", "\n")).toBe(false);
  });
});

describe("組み合わせ", () => {
  it("(a|b)*c", () => {
    expect(m("(a|b)*c", "c")).toBe(true);
    expect(m("(a|b)*c", "abbac")).toBe(true);
    expect(m("(a|b)*c", "abba")).toBe(false);
  });
  it("簡易メール風 [a-z]+@[a-z]+", () => {
    expect(m("[a-z]+@[a-z]+", "foo@bar")).toBe(true);
    expect(m("[a-z]+@[a-z]+", "foo@")).toBe(false);
    expect(m("[a-z]+@[a-z]+", "@bar")).toBe(false);
  });
});

describe("ReDoSパターンでも正しく判定（小入力）", () => {
  // 大入力での線形性・状態数の収束は tests/linear.test.ts（②の完了判定）が検証する。
  // ここでは①（derivative の実装）だけで判定できる意味論の正しさを見る。
  it("(a+)+", () => {
    expect(m("(a+)+", "aaaa")).toBe(true);
    expect(m("(a+)+", "aaaab")).toBe(false);
  });
});

describe("部分一致 search", () => {
  it("ab を含むか", () => {
    expect(compile("ab").search("xxabxx")).toBe(true);
    expect(compile("ab").search("xxaxx")).toBe(false);
  });
});

describe("サロゲートペア（絵文字）安全", () => {
  it("絵文字1文字を . で受理", () => {
    expect(m(".", "😀")).toBe(true); // コードポイント単位なので1文字扱い
  });
});

describe("量化子 {n,m}", () => {
  it("a{2,3}", () => {
    expect(m("a{2,3}", "a")).toBe(false);
    expect(m("a{2,3}", "aa")).toBe(true);
    expect(m("a{2,3}", "aaa")).toBe(true);
    expect(m("a{2,3}", "aaaa")).toBe(false);
  });
  it("a{2}（ちょうど2回）", () => {
    expect(m("a{2}", "a")).toBe(false);
    expect(m("a{2}", "aa")).toBe(true);
    expect(m("a{2}", "aaa")).toBe(false);
  });
  it("a{2,}（2回以上）", () => {
    expect(m("a{2,}", "a")).toBe(false);
    expect(m("a{2,}", "aa")).toBe(true);
    expect(m("a{2,}", "aaaaa")).toBe(true);
  });
  it("持参正規表現の定番: 日付形式", () => {
    expect(m("\\d{4}-\\d{2}-\\d{2}", "2026-07-23")).toBe(true);
    expect(m("\\d{4}-\\d{2}-\\d{2}", "2026-7-23")).toBe(false);
  });
});

describe("非貪欲量化子 *? +? ?? （DFAでは言語が変わらない）", () => {
  it("a+? は a+ と同じ言語（空文字列は受理しない）", () => {
    expect(m("a+?", "")).toBe(false);
    expect(m("a+?", "a")).toBe(true);
    expect(m("a+?", "aaa")).toBe(true);
  });
  it("a*? は a* と同じ言語", () => {
    expect(m("a*?", "")).toBe(true);
    expect(m("a*?", "aa")).toBe(true);
  });
  it("a?? は a? と同じ言語", () => {
    expect(m("a??", "")).toBe(true);
    expect(m("a??", "a")).toBe(true);
  });
});

describe("未対応構文は SyntaxError になる（黙って誤動作しない）", () => {
  // 「エラーが出ないのにマッチしない」が一番デバッグ時間を溶かすため、
  // 持参正規表現で遭遇しがちな構文は全て親切なエラーに倒す。
  it("^ と $ はエラー（test は元々全体一致なので不要）", () => {
    expect(() => compile("^abc")).toThrow(SyntaxError);
    expect(() => compile("abc$")).toThrow(SyntaxError);
  });
  it("量化子でない裸の { } はエラー", () => {
    expect(() => compile("{2}")).toThrow(SyntaxError);
    expect(() => compile("a{")).toThrow(SyntaxError);
    expect(() => compile("a{x}")).toThrow(SyntaxError);
  });
  it("未知のエスケープ（\\b など）はエラー", () => {
    expect(() => compile("\\b")).toThrow(SyntaxError);
    expect(() => compile("\\D")).toThrow(SyntaxError);
  });
  it("後方参照 \\1 はエラー（設計上あえて非対応。SPEC.md 末尾参照）", () => {
    expect(() => compile("(.+)\\1")).toThrow(SyntaxError);
  });
  it("(?:...) (?=...) などの拡張グループはエラー", () => {
    expect(() => compile("(?:ab)")).toThrow(SyntaxError);
    expect(() => compile("(?=ab)")).toThrow(SyntaxError);
  });
});
