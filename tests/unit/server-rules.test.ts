import { describe, expect, it } from "vitest";
import { getRulebookData } from "@/lib/server-rules";

describe("getRulebookData", () => {
  it("loads the mirrored server-rules markdown as ordered categories", () => {
    const rulebook = getRulebookData();

    expect(rulebook.categories).toHaveLength(15);
    expect(rulebook.totalRules).toBe(164);
    expect(rulebook.categories[0]).toMatchObject({
      id: "philosophy-and-enforcement",
      title: "Philosophy and Enforcement",
      order: 0,
    });
  });

  it("extracts stable rule ids, summaries, mechanics, and rendered sections", () => {
    const rulebook = getRulebookData();
    const core = rulebook.categories.find(
      (category) => category.id === "core-roleplay-rdm-nlr-failrp",
    );

    expect(core?.summary).toContain("random damage");
    expect(core?.mechanics).toContain("nlr");
    expect(core?.rules.map((rule) => rule.id)).toContain("CORE-001");
    expect(core?.rules[0].blocks.length).toBeGreaterThan(0);
    expect(rulebook.mechanics).toContain("television");
  });
});
