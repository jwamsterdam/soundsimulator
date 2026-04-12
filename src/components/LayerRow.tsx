import { materials } from "../data/materials";
import type { ConstructionLayer, Material } from "../types";

interface LayerRowProps {
  index: number;
  layer: ConstructionLayer;
  material: Material;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (updates: Partial<ConstructionLayer>) => void;
}

const materialTypeLabels: Record<Material["type"], string> = {
  solid_panel: "massief blad",
  air_gap: "spouw",
  porous_fill: "demping",
  thin_layer: "dunne laag",
};

export function LayerRow({ index, layer, material, canRemove, onRemove, onUpdate }: LayerRowProps) {
  return (
    <div className={`layer-row layer-${material.type}`}>
      <div className="layer-index">{index + 1}</div>
      <label className="field material-field">
        <span>Materiaal</span>
        <select
          value={layer.materialId}
          onChange={(event) => {
            const nextMaterial = materials.find((item) => item.id === event.target.value);
            onUpdate({
              materialId: event.target.value,
              thicknessMm: nextMaterial?.typicalThicknessesMm[0] ?? layer.thicknessMm,
            });
          }}
        >
          {materials.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field thickness-field">
        <span>Dikte mm</span>
        <input
          min={1}
          step={0.5}
          type="number"
          value={layer.thicknessMm}
          onChange={(event) => onUpdate({ thicknessMm: Number(event.target.value) })}
        />
      </label>
      <span className="type-badge">{materialTypeLabels[material.type]}</span>
      <button
        className="remove-button"
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Verwijder laag ${index + 1}`}
      >
        -
      </button>
    </div>
  );
}
