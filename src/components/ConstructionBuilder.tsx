import { useState, type DragEvent } from "react";
import { materials, materialById } from "../data/materials";
import { getReorderTargetIndexFromInsertionIndex, isNoopInsertionIndex } from "../lib/layers";
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropInsertionIndex, setDropInsertionIndex] = useState<number | null>(null);

  const visibleInsertionIndex =
    draggedIndex !== null &&
    dropInsertionIndex !== null &&
    !isNoopInsertionIndex(draggedIndex, dropInsertionIndex)
      ? dropInsertionIndex
      : null;

  function handleReorder(fromIndex: number, insertionIndex: number) {
    if (!isNoopInsertionIndex(fromIndex, insertionIndex)) {
      onReorderLayer(fromIndex, getReorderTargetIndexFromInsertionIndex(fromIndex, insertionIndex));
    }
    setDraggedIndex(null);
    setDropInsertionIndex(null);
  }

  function handleIndicatorDragOver(insertionIndex: number, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropInsertionIndex(insertionIndex);
  }

  function handleIndicatorDrop(insertionIndex: number, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isFinite(sourceIndex)) {
      handleReorder(sourceIndex, insertionIndex);
    }
  }

  function handleFallbackDragOver(event: DragEvent<HTMLElement>) {
    if (visibleInsertionIndex === null) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleFallbackDrop(event: DragEvent<HTMLElement>) {
    if (visibleInsertionIndex === null) {
      return;
    }

    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isFinite(sourceIndex)) {
      handleReorder(sourceIndex, visibleInsertionIndex);
    }
  }

  return (
    <section
      className="panel construction-panel"
      onDragOver={handleFallbackDragOver}
      onDrop={handleFallbackDrop}
      aria-labelledby="construction-title"
    >
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
          <div className="layer-drop-group" key={layer.id}>
            {visibleInsertionIndex === index ? (
              <div
                className="layer-drop-zone"
                onDragOver={(event) => handleIndicatorDragOver(index, event)}
                onDrop={(event) => handleIndicatorDrop(index, event)}
              >
                <div className="layer-drop-indicator" />
              </div>
            ) : null}
            <LayerRow
              index={index}
              layer={layer}
              material={materialById.get(layer.materialId) ?? materials[0]}
              canRemove={layers.length > 1}
              isDragging={draggedIndex === index}
              onDuplicate={() => onDuplicateLayer(layer.id)}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDropInsertionIndex(null);
              }}
              onDragPosition={(insertionIndex) => setDropInsertionIndex(insertionIndex)}
              onDragStart={() => setDraggedIndex(index)}
              onRemove={() => onRemoveLayer(layer.id)}
              onReorder={handleReorder}
              onUpdate={(updates) => onUpdateLayer(layer.id, updates)}
            />
          </div>
        ))}
        {visibleInsertionIndex === layers.length ? (
          <div
            className="layer-drop-zone"
            onDragOver={(event) => handleIndicatorDragOver(layers.length, event)}
            onDrop={(event) => handleIndicatorDrop(layers.length, event)}
          >
            <div className="layer-drop-indicator" />
          </div>
        ) : null}
      </div>

      <button className="add-layer-button" type="button" onClick={onAddLayer}>
        + Voeg laag toe
      </button>
    </section>
  );
}
