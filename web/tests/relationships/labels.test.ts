import { describe, expect, it } from "vitest";

import { defaultReciprocalLabel, labelText, parseRelationshipLabel, relationshipCategory } from "@/lib/relationships/labels";

describe("relationship labels", () => {
  it("uses parent/child as reciprocal directional labels", () => {
    expect(defaultReciprocalLabel("parent")).toBe("child");
    expect(defaultReciprocalLabel("child")).toBe("parent");
    expect(defaultReciprocalLabel("friend")).toBe("friend");
  });

  it("parses supported labels and falls back for invalid input", () => {
    expect(parseRelationshipLabel("ex")).toBe("ex");
    expect(parseRelationshipLabel("not-a-label", "colleague")).toBe("colleague");
  });

  it("groups labels into interpretation categories", () => {
    expect(relationshipCategory("spouse")).toBe("romantic");
    expect(relationshipCategory("sibling")).toBe("family");
    expect(relationshipCategory("colleague")).toBe("work");
    expect(labelText("romantic_partner")).toBe("Romantic partner");
  });
});
