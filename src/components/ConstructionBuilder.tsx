import { materials, materialById } from "../data/materials";
import type { ConstructionLayer } from "../types";
import { LayerRow } from "./LayerRow";

interface ConstructionBuilderProps {
  layers: ConstructionLayer[];
  onAddLayer: () => void;
  onDuplicateLayer: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onReorderLayer: (fromIndex: number, toIndex: number) => void;
  onUpdateLayer: (layerId: string, updates: Partial<ConstructionLayer>) => void;
}

export function ConstructionBuilder({
  layers,
  onAddLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onReorderLayer,
  onUpdateLayer,
}: ConstructionBuilderProps) {
  return (
    <section className="panel construction-panel" aria-labelledby="construction-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">1D transmissiepad</p>
          <h2 id="construction-title">Constructie opbouw</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onAddLayer}>
          + Laag
        </button>
      </div>

      <div className="layer-stack">
        {layers.map((layer, index) => (
          <LayerRow
            key={layer.id}
            index={index}
            layer={layer}
            material={materialById.get(layer.materialId) ?? materials[0]}
            canRemove={layers.length > 1}
            onDuplicate={() => onDuplicateLayer(layer.id)}
            onRemove={() => onRemoveLayer(layer.id)}
            onReorder={onReorderLayer}
            onUpdate={(updates) => onUpdateLayer(layer.id, updates)}
          />
        ))}
      </div>

      <button className="add-layer-button" type="button" onClick={onAddLayer}>
        + Voeg laag toe
      </button>
    </section>
  );
}
