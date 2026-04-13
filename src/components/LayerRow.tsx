import { memo, type DragEvent } from "react";
import { materials } from "../data/materials";
import type { ConstructionLayer, Material } from "../types";

interface LayerRowProps {
  index: number;
  layer: ConstructionLayer;
  material: Material;
  canRemove: boolean;
  isDragging: boolean;
  onDuplicate: () => void;
  onDragEnd: () => void;
  onDragPosition: (insertionIndex: number) => void;
  onDragStart: () => void;
  onRemove: () => void;
  onReorder: (fromIndex: number, insertionIndex: number) => void;
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
  isDragging,
  onDuplicate,
  onDragEnd,
  onDragPosition,
  onDragStart,
  onRemove,
  onReorder,
  onUpdate,
}: LayerRowProps) {
  return (
    <div
      className={`layer-row layer-${material.type}${isDragging ? " is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragPosition(getInsertionIndex(index, event));
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isFinite(sourceIndex)) {
          onReorder(sourceIndex, getInsertionIndex(index, event));
        }
      }}
    >
      <div className="layer-controls">
        <div className="layer-index">{index + 1}</div>
        <button
          className="drag-handle"
          draggable
          type="button"
          onDragEnd={onDragEnd}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(index));
            onDragStart();
          }}
          aria-label={`Versleep laag ${index + 1}`}
        >
          <span className="drag-icon" aria-hidden="true">
            <span className="drag-icon-up" />
            <span className="drag-icon-down" />
          </span>
        </button>
        <button
          className="duplicate-button"
          type="button"
          onClick={onDuplicate}
          aria-label={`Dupliceer laag ${index + 1}`}
        >
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
      <label className="field material-field">
        <span className="field-label">
          Materiaal <span className="type-badge">{materialTypeLabels[material.type]}</span>
        </span>
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
        <span className="field-label">Dikte mm</span>
        <input
          min={1}
          step={0.5}
          type="number"
          value={layer.thicknessMm}
          onChange={(event) => onUpdate({ thicknessMm: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}

export const LayerRow = memo(LayerRowComponent);

function getInsertionIndex(index: number, event: DragEvent<HTMLElement>): number {
  const bounds = event.currentTarget.getBoundingClientRect();
  const isLowerHalf = event.clientY > bounds.top + bounds.height / 2;
  return isLowerHalf ? index + 1 : index;
}
