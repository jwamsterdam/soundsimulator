export type MaterialType = "solid_panel" | "air_gap" | "porous_fill" | "thin_layer";

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  density?: number;
  lossFactor?: number;
  flowResistivity?: number;
  typicalThicknessesMm: number[];
  uiCategory: string;
  notes?: string;
}

export interface ConstructionLayer {
  id: string;
  materialId: string;
  thicknessMm: number;
}

export interface FrequencyBandResult {
  frequencyHz: number;
  attenuationDb: number;
  notes?: string[];
}

export type DetectedSystemType =
  | "single_leaf"
  | "bonded_mass"
  | "mass_spring_mass"
  | "mixed_or_ambiguous";

export interface SimulationResult {
  bands: FrequencyBandResult[];
  systemType: DetectedSystemType;
  estimatedResonanceHz?: number;
  totalSurfaceMassKgM2: number;
  leafMassesKgM2?: [number, number];
  cavityThicknessMm?: number;
  hasPorousFill: boolean;
  warnings: string[];
}

export interface DemoTrack {
  id: string;
  title: string;
  artist: string;
  focus: "music" | "sound";
  src: string;
}

export type PlaybackMode = "original" | "existing" | "improved";

export type PlaybackVolumeMode = "comparison" | "realistic";

export type FirImpulsePreset = "16" | "32" | "64" | "128" | "256" | "512" | "1024";

export type AudioContextProfile = "default" | "interactive-48k";

export interface AudioPerformanceSettings {
  firImpulsePreset: FirImpulsePreset;
  audioContextProfile: AudioContextProfile;
}
