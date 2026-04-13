import { materialById } from "../data/materials";
import type { ConstructionLayer } from "../types";

interface ConstructionPreviewProps {
  title: string;
  layers: ConstructionLayer[];
}

const patternByType = {
  solid_panel: "preview-hatch-solid",
  air_gap: "preview-hatch-air",
  porous_fill: "preview-hatch-fill",
  thin_layer: "preview-hatch-thin",
} as const;

const PREVIEW_PIXELS_PER_MM = 0.75;
const MIN_VISIBLE_LAYER_WIDTH_PX = 4;

export function ConstructionPreview({ title, layers }: ConstructionPreviewProps) {
  const totalThicknessMm = layers.reduce((total, layer) => total + layer.thicknessMm, 0);

  return (
    <section className="panel preview-panel" aria-labelledby={`${slugify(title)}-title`}>
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Doorsnede</p>
          <h2 id={`${slugify(title)}-title`}>{title}</h2>
        </div>
      </div>
      <div className="construction-preview" role="img" aria-label={`Lijntekening doorsnede van ${title}`}>
        <div className="construction-preview-stack">
          {layers.map((layer, index) => {
            const material = materialById.get(layer.materialId);
            const layerWidthPx = Math.max(MIN_VISIBLE_LAYER_WIDTH_PX, layer.thicknessMm * PREVIEW_PIXELS_PER_MM);
            return (
              <div
                className={`preview-layer ${material ? patternByType[material.type] : "preview-hatch-thin"}`}
                key={`${layer.id}-${index}`}
                style={{ flexBasis: `${layerWidthPx}px` }}
                title={`${material?.name ?? layer.materialId}, ${layer.thicknessMm} mm`}
              >
                <span>{formatPreviewLabel(material?.name ?? layer.materialId)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="preview-scale-note">Totale dikte: {formatThickness(totalThicknessMm)} mm</p>
    </section>
  );
}

function formatPreviewLabel(name: string): string {
  return name.replace("Steenwol", "SW").replace("Luchtspouw", "Spouw").replace("Gipsplaat", "Gips");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function formatThickness(thicknessMm: number): string {
  return Number.isInteger(thicknessMm) ? String(thicknessMm) : thicknessMm.toFixed(1).replace(".", ",");
}
