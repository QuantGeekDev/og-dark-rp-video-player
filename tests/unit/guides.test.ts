import { describe, expect, it } from "vitest";
import { getGuidebookData } from "@/lib/guides";

describe("getGuidebookData", () => {
  it("loads the generated guide snapshot as ordered player guides", () => {
    const guidebook = getGuidebookData();

    expect(guidebook.totalGuides).toBe(34);
    expect(guidebook.guides[0]).toMatchObject({
      id: "welcome-to-dark-rp",
      title: "Welcome to Dark RP",
      category: "Start Here",
      order: 0,
    });
    expect(guidebook.categories.map((category) => category.title)).toContain(
      "Crime",
    );
  });

  it("extracts guide sections, aliases, related links, and search text", () => {
    const guidebook = getGuidebookData();
    const television = guidebook.guides.find(
      (guide) => guide.id === "cinema-and-television",
    );

    expect(television?.quickStart?.blocks.length).toBeGreaterThan(0);
    expect(television?.details?.text).toContain("YouTube");
    expect(television?.gotchas?.text).toContain("video URL");
    expect(television?.aliases).toContain("tv");
    expect(television?.related).toContain("support-and-staff-help");
    expect(television?.searchText).toContain("kiosk");
  });
});

