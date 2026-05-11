import { RelationshipLabelSchema, type RelationshipLabel } from "@/lib/schemas";

export const RELATIONSHIP_LABEL_OPTIONS: Array<{ value: RelationshipLabel; label: string }> = [
  { value: "friend", label: "Friend" },
  { value: "romantic_partner", label: "Romantic partner" },
  { value: "spouse", label: "Spouse" },
  { value: "ex", label: "Ex" },
  { value: "sibling", label: "Sibling" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "colleague", label: "Colleague" },
];

export function parseRelationshipLabel(value: unknown, fallback: RelationshipLabel = "friend") {
  const parsed = RelationshipLabelSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function labelText(value: RelationshipLabel) {
  return RELATIONSHIP_LABEL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function defaultReciprocalLabel(label: RelationshipLabel): RelationshipLabel {
  if (label === "parent") {
    return "child";
  }
  if (label === "child") {
    return "parent";
  }
  return label;
}

export function relationshipCategory(label: RelationshipLabel) {
  if (label === "romantic_partner" || label === "spouse" || label === "ex") {
    return "romantic";
  }
  if (label === "parent" || label === "child" || label === "sibling") {
    return "family";
  }
  if (label === "colleague") {
    return "work";
  }
  return "social";
}
