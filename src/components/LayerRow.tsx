import { memo } from "react";
import { materials } from "../data/materials";
import type { ConstructionLayer, Material } from "../types";

interface LayerRowProps {
  index: number;
  layer: ConstructionLayer;
  material: Material;
  canRemove: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdate: (updates: Partial<ConstructionLayer>) => void;
}

const materialTypeLabels: Record<Material["type"], string> = {
  solid_panel: "massief blad",
  air_gap: "spouw",
  porous_fill: "demping",
  thin_layer: "dunne laag",
};

function LayerRowComponent({
  index,
  layer,
  material,
  canRemove,
  onDuplicate,
  onRemove,
  onReorder,
  onUpdate,
}: LayerRowProps) {
  return (
    <div
      className={`layer-row layer-${material.type}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isFinite(sourceIndex) && sourceIndex !== index) {
          onReorder(sourceIndex, index);
        }
      }}
    >
      <button
        className="drag-handle"
        draggable
        type="button"
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", String(index));
        }}
        aria-label={`Versleep laag ${index + 1}`}
      >
        ::
      </button>
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
      <button className="duplicate-button" type="button" onClick={onDuplicate} aria-label={`Dupliceer laag ${index + 1}`}>
        +
      </button>
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

export const LayerRow = memo(LayerRowComponent);
