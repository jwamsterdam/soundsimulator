import {
  duplicateConstructionLayer,
  getReorderTargetIndexFromInsertionIndex,
  isNoopInsertionIndex,
  reorderConstructionLayers,
} from "./layers";
import type { ConstructionLayer } from "../types";

export function runLayerInteractionValidation(): void {
  const layers: ConstructionLayer[] = [
    { id: "a", materialId: "gipsplaat", thicknessMm: 12.5 },
    { id: "b", materialId: "luchtspouw", thicknessMm: 70 },
    { id: "c", materialId: "steenwol-middel", thicknessMm: 70 },
    { id: "d", materialId: "gipsplaat", thicknessMm: 12.5 },
  ];

  const reorderedDown = reorderConstructionLayers(layers, 0, 2);
  assertOrder(reorderedDown, ["b", "c", "a", "d"], "dragging first layer to index 2");

  const reorderedUp = reorderConstructionLayers(layers, 3, 1);
  assertOrder(reorderedUp, ["a", "d", "b", "c"], "dragging last layer to index 1");

  const unchanged = reorderConstructionLayers(layers, 1, 1);
  assert(unchanged === layers, "No-op reorder should preserve array reference.");

  assert(getReorderTargetIndexFromInsertionIndex(0, 3) === 2, "Downward insertion should account for removed source.");
  assert(getReorderTargetIndexFromInsertionIndex(3, 1) === 1, "Upward insertion should keep the insertion index.");
  assert(isNoopInsertionIndex(1, 1), "Insertion before self should be a visual no-op.");
  assert(isNoopInsertionIndex(1, 2), "Insertion after self should be a visual no-op.");
  assert(!isNoopInsertionIndex(1, 3), "Insertion below the next row should not be a visual no-op.");

  const duplicated = duplicateConstructionLayer(layers, "b", () => "b-copy");
  assertOrder(duplicated, ["a", "b", "b-copy", "c", "d"], "duplicating layer b");
  assert(duplicated[2].materialId === "luchtspouw", "Duplicated layer should preserve material.");
  assert(duplicated[2].thicknessMm === 70, "Duplicated layer should preserve thickness.");
}

function assertOrder(layers: ConstructionLayer[], expectedIds: string[], label: string): void {
  const actualIds = layers.map((layer) => layer.id);
  assert(
    actualIds.join("|") === expectedIds.join("|"),
    `Unexpected order after ${label}. Expected ${expectedIds.join(", ")}, got ${actualIds.join(", ")}.`,
  );
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[layer interaction validation] ${message}`);
  }
}
