import "./WallVisualizer.css";

export type WallLayer = {
  id: string;
  label: string;
  materialType: "brick" | "air" | "metalStud" | "insulation" | "gypsum" | "finish";
  thicknessMm: number;
};

export type WallVisualizerMode = "without" | "with" | "compare";

export type WallVisualizerProps = {
  existingWallLayers: WallLayer[];
  voorzetwandLayers: WallLayer[];
  currentRwDb: number;
  improvedRwDb: number;
  activeMode: WallVisualizerMode;
  onModeChange?: (mode: WallVisualizerMode) => void;
};

const modeLabels: Record<WallVisualizerMode, string> = {
  without: "A Zonder",
  with: "B Met",
  compare: "A/B Vergelijk",
};

export function WallVisualizer({
  existingWallLayers,
  voorzetwandLayers,
  currentRwDb,
  improvedRwDb,
  activeMode,
  onModeChange,
}: WallVisualizerProps) {
  const safeExistingLayers = existingWallLayers.length > 0 ? existingWallLayers : fallbackExistingWallLayers;
  const safeVoorzetwandLayers = voorzetwandLayers.length > 0 ? voorzetwandLayers : fallbackVoorzetwandLayers;
  const visibleExistingLayer = safeExistingLayers[0];
  const improvementDb = Math.max(0, improvedRwDb - currentRwDb);

  return (
    <section className={`wall-visualizer wall-visualizer-${activeMode}`} aria-label="Voorzetwand visualisatie">
      <div className="wall-visualizer-stage">
        <div
          className={`wall-visualizer-base-wall wall-visualizer-base-${visibleExistingLayer.materialType}`}
          aria-hidden="true"
        />
        <div className="wall-visualizer-floor-plane" aria-hidden="true" />
        <div className="wall-visualizer-ceiling-slice" aria-hidden="true" />

        <div className="wall-visualizer-half wall-visualizer-half-without">
          <div className="wall-visualizer-stat">
            <span>Zonder voorzetwand</span>
            <strong>{currentRwDb.toFixed(1)} dB</strong>
          </div>
        </div>

        <div className="wall-visualizer-half wall-visualizer-half-with">
          <div className="wall-visualizer-stat">
            <span>Met voorzetwand</span>
            <strong>{improvedRwDb.toFixed(1)} dB</strong>
          </div>
        </div>

        <ConstructionBuildUp layers={safeVoorzetwandLayers} />

        <div className="wall-visualizer-improvement">
          +{improvementDb.toFixed(1)} dB extra demping
        </div>

        <div className="wall-visualizer-toggle" aria-label="Visualisatiemodus">
          {(Object.keys(modeLabels) as WallVisualizerMode[]).map((mode) => (
            <button
              className={activeMode === mode ? "is-active" : ""}
              key={mode}
              type="button"
              onClick={() => onModeChange?.(mode)}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConstructionBuildUp({ layers }: { layers: WallLayer[] }) {
  const totalThickness = layers.reduce((total, layer) => total + Math.max(layer.thicknessMm, 1), 0);

  return (
    <div className="wall-visualizer-build-up" aria-label="Nieuwe lagen opgebouwd op de bestaande muur">
      <div className="wall-visualizer-build-anchor" aria-hidden="true" />
      <div className="wall-visualizer-build-layers">
        {layers.map((layer, index) => {
          const widthPercent = (Math.max(layer.thicknessMm, 1) / totalThickness) * 100;
          return (
            <span
              className={`wall-visualizer-layer wall-visualizer-layer-${layer.materialType}`}
              key={layer.id}
              style={{ width: `${widthPercent}%`, zIndex: index + 1 }}
              title={`${layer.label}: ${layer.thicknessMm} mm`}
            >
              <i>{layer.label}</i>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export const wallVisualizerExampleProps: WallVisualizerProps = {
  existingWallLayers: [
    { id: "brick-100", label: "Baksteen", materialType: "brick", thicknessMm: 100 },
  ],
  voorzetwandLayers: [
    { id: "air-40", label: "Spouw", materialType: "air", thicknessMm: 40 },
    { id: "stud-45", label: "Metal stud", materialType: "metalStud", thicknessMm: 45 },
    { id: "insulation-45", label: "Wol", materialType: "insulation", thicknessMm: 45 },
    { id: "gypsum-125-a", label: "Gips", materialType: "gypsum", thicknessMm: 12.5 },
    { id: "gypsum-125-b", label: "Gips", materialType: "gypsum", thicknessMm: 12.5 },
    { id: "finish-3", label: "Finish", materialType: "finish", thicknessMm: 3 },
  ],
  currentRwDb: 49.5,
  improvedRwDb: 61.8,
  activeMode: "compare" as const,
};

const fallbackExistingWallLayers: WallLayer[] = wallVisualizerExampleProps.existingWallLayers;
const fallbackVoorzetwandLayers: WallLayer[] = wallVisualizerExampleProps.voorzetwandLayers;
