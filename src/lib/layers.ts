import type { ConstructionLayer } from "../types";

export function duplicateConstructionLayer(
  layers: ConstructionLayer[],
  layerId: string,
  createLayerId: () => string,
): ConstructionLayer[] {
  const layerIndex = layers.findIndex((layer) => layer.id === layerId);
  if (layerIndex === -1) {
    return layers;
  }

  const duplicatedLayer = { ...layers[layerIndex], id: createLayerId() };
  return [...layers.slice(0, layerIndex + 1), duplicatedLayer, ...layers.slice(layerIndex + 1)];
}

export function reorderConstructionLayers(
  layers: ConstructionLayer[],
  fromIndex: number,
  toIndex: number,
): ConstructionLayer[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= layers.length ||
    toIndex >= layers.length
  ) {
    return layers;
  }

  const nextLayers = [...layers];
  const [movedLayer] = nextLayers.splice(fromIndex, 1);
  nextLayers.splice(toIndex, 0, movedLayer);
  return nextLayers;
}

export function getReorderTargetIndexFromInsertionIndex(fromIndex: number, insertionIndex: number): number {
  if (insertionIndex > fromIndex) {
    return insertionIndex - 1;
  }
  return insertionIndex;
}

export function isNoopInsertionIndex(fromIndex: number, insertionIndex: number): boolean {
  return insertionIndex === fromIndex || insertionIndex === fromIndex + 1;
}
