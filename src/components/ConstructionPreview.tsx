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

export function ConstructionPreview({ title, layers }: ConstructionPreviewProps) {
  const totalVisualThickness = layers.reduce((total, layer) => total + Math.max(8, layer.thicknessMm), 0);

  return (
    <section className="panel preview-panel" aria-labelledby={`${slugify(title)}-title`}>
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Doorsnede</p>
          <h2 id={`${slugify(title)}-title`}>{title}</h2>
        </div>
      </div>
      <div className="construction-preview" role="img" aria-label={`Lijntekening doorsnede van ${title}`}>
        {layers.map((layer, index) => {
          const material = materialById.get(layer.materialId);
          const flexGrow = Math.max(8, layer.thicknessMm) / totalVisualThickness;
          return (
            <div
              className={`preview-layer ${material ? patternByType[material.type] : "preview-hatch-thin"}`}
              key={`${layer.id}-${index}`}
              style={{ flexGrow }}
              title={`${material?.name ?? layer.materialId}, ${layer.thicknessMm} mm`}
            >
              <span>{formatPreviewLabel(material?.name ?? layer.materialId)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatPreviewLabel(name: string): string {
  return name.replace("Steenwol", "SW").replace("Luchtspouw", "Spouw").replace("Gipsplaat", "Gips");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
