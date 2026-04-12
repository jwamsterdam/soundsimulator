import type { ConstructionLayer } from "../types";

export function hashConstructionLayers(layers: ConstructionLayer[]): string {
  return layers
    .map((layer) => `${layer.materialId}:${roundThickness(layer.thicknessMm)}`)
    .join("|");
}

function roundThickness(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}
