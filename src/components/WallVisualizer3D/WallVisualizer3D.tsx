import { useMemo, type CSSProperties } from "react";
import "./WallVisualizer3D.css";
import type { WallLayer, WallLayerTexture, WallVisualizer3DProps } from "./types";

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 520;
const DEFAULT_LAYER_COLOR = "#b8b2a8";
const DEPTH_SCALE = 0.34;
const MIN_DEPTH_PX = 4;
const MAX_DEPTH_PX = 90;
const VANISHING_POINT = { x: 1040, y: 26 };

type Point = {
  x: number;
  y: number;
};

type FaceLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  polygon: string;
};

type LayerLayout = {
  layer: WallLayer;
  index: number;
  depthPx: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isOuterFace: boolean;
  topFace: FaceLayout;
  sideFace: FaceLayout;
};

type WallGroupLayout = {
  title: string;
  layers: LayerLayout[];
  totalThicknessMm: number;
};

type SceneLayout = {
  existingWall: WallGroupLayout;
  newWall: WallGroupLayout;
  totalThicknessMm: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getValidThickness(thicknessMm: number): number {
  return Number.isFinite(thicknessMm) && thicknessMm > 0 ? thicknessMm : 0;
}

function getVisualDepth(thicknessMm: number): number {
  if (thicknessMm <= 0) {
    return MIN_DEPTH_PX;
  }

  return clamp(thicknessMm * DEPTH_SCALE, MIN_DEPTH_PX, MAX_DEPTH_PX);
}

function projectTowardVanishingPoint(point: Point, depthPx: number): Point {
  const distance = Math.hypot(VANISHING_POINT.x - point.x, VANISHING_POINT.y - point.y) || 1;
  const progress = depthPx / distance;

  return {
    x: point.x + (VANISHING_POINT.x - point.x) * progress,
    y: point.y + (VANISHING_POINT.y - point.y) * progress,
  };
}

function makeFaceLayout(points: Point[], origin: Point): FaceLayout {
  const localPoints = points.map((point) => ({
    x: point.x - origin.x,
    y: point.y - origin.y,
  }));
  const minX = Math.min(...localPoints.map((point) => point.x));
  const minY = Math.min(...localPoints.map((point) => point.y));
  const maxX = Math.max(...localPoints.map((point) => point.x));
  const maxY = Math.max(...localPoints.map((point) => point.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const polygon = localPoints
    .map((point) => `${((point.x - minX) / width) * 100}% ${((point.y - minY) / height) * 100}%`)
    .join(", ");

  return {
    left: minX,
    top: minY,
    width,
    height,
    polygon,
  };
}

function makeProjectedFaces(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  depthPx: number;
}): { topFace: FaceLayout; sideFace: FaceLayout } {
  const topLeft = { x: params.x, y: params.y };
  const topRight = { x: params.x + params.width, y: params.y };
  const bottomRight = { x: params.x + params.width, y: params.y + params.height };
  const projectedTopLeft = projectTowardVanishingPoint(topLeft, params.depthPx);
  const projectedTopRight = projectTowardVanishingPoint(topRight, params.depthPx);
  const projectedBottomRight = projectTowardVanishingPoint(bottomRight, params.depthPx);

  return {
    topFace: makeFaceLayout([topLeft, topRight, projectedTopRight, projectedTopLeft], topLeft),
    sideFace: makeFaceLayout([topRight, bottomRight, projectedBottomRight, projectedTopRight], topLeft),
  };
}

function sanitizeLayer(layer: WallLayer, index: number): WallLayer {
  return {
    ...layer,
    id: layer.id || `wall-layer-${index}`,
    name: layer.name || `Laag ${index + 1}`,
    material: layer.material || "Materiaal",
    thicknessMm: getValidThickness(layer.thicknessMm),
    color: layer.color || DEFAULT_LAYER_COLOR,
    texture: layer.texture || "generic",
  };
}

function getVisibleLayers(layers: WallLayer[] = []): WallLayer[] {
  return layers.filter((layer) => layer.visible !== false).map(sanitizeLayer);
}

function makeWallLayout(params: {
  title: string;
  layers: WallLayer[];
  baseX: number;
  baseY: number;
  width: number;
  height: number;
  zIndexBase: number;
  stepX: number;
  stepY: number;
}): WallGroupLayout {
  let cumulativeDepth = 0;
  const visibleLayers = getVisibleLayers(params.layers);
  const totalThicknessMm = visibleLayers.reduce((total, layer) => total + getValidThickness(layer.thicknessMm), 0);

  // The physical thickness is rendered as pseudo-3D depth, not as panel width.
  // Each next layer is offset by the cumulative visual depth, so the stack reads
  // as plates being added in front of the wall.
  const layerLayouts = visibleLayers.map((layer, index) => {
    const depthPx = getVisualDepth(layer.thicknessMm);
    const x = params.baseX + cumulativeDepth * params.stepX;
    const y = params.baseY + cumulativeDepth * params.stepY;
    const faces = makeProjectedFaces({
      x,
      y,
      width: params.width,
      height: params.height,
      depthPx,
    });
    const layout: LayerLayout = {
      layer,
      index,
      depthPx,
      x,
      y,
      width: params.width,
      height: params.height,
      zIndex: params.zIndexBase + index,
      isOuterFace: index === visibleLayers.length - 1,
      ...faces,
    };

    cumulativeDepth += depthPx;
    return layout;
  });

  return {
    title: params.title,
    layers: layerLayouts,
    totalThicknessMm,
  };
}

function formatThickness(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
}

function getLayerTexture(layer: WallLayer): WallLayerTexture {
  return layer.texture || "generic";
}

export function WallVisualizer3D({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  showLabels = true,
  showThickness = true,
  showTotals = true,
  className,
}: WallVisualizer3DProps) {
  const layout = useMemo<SceneLayout>(() => {
    const existingWall = makeWallLayout({
      title: data.existingWall.title || "Oude muur",
      layers: data.existingWall.layers,
      baseX: 290,
      baseY: 104,
      width: 520,
      height: 248,
      zIndexBase: 10,
      stepX: 0.68,
      stepY: 0.22,
    });

    const newWall = makeWallLayout({
      title: data.newWall.title || "Nieuwe muur",
      layers: data.newWall.layers,
      baseX: 440,
      baseY: 218,
      width: 405,
      height: 176,
      zIndexBase: 80,
      stepX: 0.82,
      stepY: 0.26,
    });

    return {
      existingWall,
      newWall,
      totalThicknessMm: existingWall.totalThicknessMm + newWall.totalThicknessMm,
    };
  }, [data]);

  const hasExistingLayers = layout.existingWall.layers.length > 0;
  const hasNewLayers = layout.newWall.layers.length > 0;
  const viewBoxStyle = {
    "--wv3d-width": `${width}px`,
    "--wv3d-height": `${height}px`,
  } as CSSProperties;

  return (
    <section
      className={`wall-visualizer-3d${className ? ` ${className}` : ""}`}
      aria-label="Semi-3D visualisatie van muuropbouw"
      style={viewBoxStyle}
    >
      <div className="wv3d-stage" style={{ aspectRatio: `${width} / ${height}` }}>
        <div className="wv3d-scene" style={{ width, height }}>
          <div className="wv3d-floor" aria-hidden="true" />
          <div className="wv3d-back-glow" aria-hidden="true" />

          {!hasExistingLayers ? (
            <p className="wv3d-empty wv3d-empty-existing">Geen bestaande muur gekozen</p>
          ) : (
            layout.existingWall.layers.map((layerLayout) => (
              <WallLayerBlock key={layerLayout.layer.id} group="existing" layout={layerLayout} />
            ))
          )}

          {!hasNewLayers ? (
            <p className="wv3d-empty wv3d-empty-new">Voeg lagen toe aan de voorzetwand</p>
          ) : (
            layout.newWall.layers.map((layerLayout) => (
              <WallLayerBlock key={layerLayout.layer.id} group="new" layout={layerLayout} />
            ))
          )}

          {showLabels ? (
            <>
              <LayerCallouts title={layout.existingWall.title} layers={layout.existingWall.layers} variant="existing" />
              <LayerCallouts title={layout.newWall.title} layers={layout.newWall.layers} variant="new" />
            </>
          ) : null}

          {showTotals ? (
            <dl className="wv3d-totals">
              <div>
                <dt>Bestaande muur</dt>
                <dd>{formatThickness(layout.existingWall.totalThicknessMm)} mm</dd>
              </div>
              <div>
                <dt>Voorzetwand</dt>
                <dd>{formatThickness(layout.newWall.totalThicknessMm)} mm</dd>
              </div>
              <div>
                <dt>Totaal incl. oude muur</dt>
                <dd>{formatThickness(layout.totalThicknessMm)} mm</dd>
              </div>
            </dl>
          ) : null}

          {showThickness ? (
            <div className="wv3d-legend" aria-label="Legenda">
              <span>
                <i className="wv3d-legend-front" /> zichtbare voorkant
              </span>
              <span>
                <i className="wv3d-legend-depth" /> zichtbare zijkant / diepte
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function WallLayerBlock({ group, layout }: { group: "existing" | "new"; layout: LayerLayout }) {
  const texture = getLayerTexture(layout.layer);
  const layerStyle = {
    "--layer-color": layout.layer.color,
    "--layer-depth": `${layout.depthPx}px`,
    "--layer-top-depth": `${layout.depthPx * 0.55}px`,
    "--layer-x": `${layout.x}px`,
    "--layer-y": `${layout.y}px`,
    "--layer-width": `${layout.width}px`,
    "--layer-height": `${layout.height}px`,
    "--layer-top-left": `${layout.topFace.left}px`,
    "--layer-top-top": `${layout.topFace.top}px`,
    "--layer-top-width": `${layout.topFace.width}px`,
    "--layer-top-height": `${layout.topFace.height}px`,
    "--layer-top-polygon": layout.topFace.polygon,
    "--layer-side-left": `${layout.sideFace.left}px`,
    "--layer-side-top": `${layout.sideFace.top}px`,
    "--layer-side-width": `${layout.sideFace.width}px`,
    "--layer-side-height": `${layout.sideFace.height}px`,
    "--layer-side-polygon": layout.sideFace.polygon,
    zIndex: layout.zIndex,
  } as CSSProperties;

  return (
    <article
      className={`wv3d-layer wv3d-layer-${group} texture-${texture}${layout.isOuterFace ? " is-outer-face" : ""}`}
      style={layerStyle}
      aria-label={`${layout.layer.name}, ${formatThickness(layout.layer.thicknessMm)} millimeter`}
    >
      <div className="layer-top" />
      <div className="layer-side" />
      <div className="layer-front">
        {texture === "gypsum" && layout.isOuterFace ? (
          <>
            <span className="wv3d-screw screw-tl" />
            <span className="wv3d-screw screw-tr" />
            <span className="wv3d-screw screw-bl" />
            <span className="wv3d-screw screw-br" />
          </>
        ) : null}
      </div>
    </article>
  );
}

function LayerCallouts({
  title,
  layers,
  variant,
}: {
  title: string;
  layers: LayerLayout[];
  variant: "existing" | "new";
}) {
  return (
    <div className={`wv3d-callouts wv3d-callouts-${variant}`}>
      <h3>{title}</h3>
      <ol>
        {layers.map((item) => (
          <li key={item.layer.id}>
            <span className="wv3d-callout-dot" />
            <strong>{item.index + 1}. {item.layer.name}</strong>
            <span>{item.layer.material}</span>
            <em>{formatThickness(item.layer.thicknessMm)} mm</em>
          </li>
        ))}
      </ol>
    </div>
  );
}
