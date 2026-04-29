export type WallLayerTexture =
  | "brick"
  | "concrete"
  | "insulation"
  | "wood"
  | "gypsum"
  | "membrane"
  | "air"
  | "generic";

export type WallLayer = {
  id: string;
  name: string;
  material: string;
  thicknessMm: number;
  color: string;
  texture?: WallLayerTexture;
  visible?: boolean;
};

export type WallVisualizerData = {
  existingWall: {
    title: string;
    layers: WallLayer[];
  };
  newWall: {
    title: string;
    layers: WallLayer[];
  };
};

export type WallVisualizer3DProps = {
  data: WallVisualizerData;
  width?: number;
  height?: number;
  showLabels?: boolean;
  showThickness?: boolean;
  showTotals?: boolean;
  className?: string;
};
