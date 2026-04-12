import type { FrequencyBandResult, SimulationResult } from "../types";

export interface PlaybackEqBand {
  frequencyHz: number;
  calculatedTlDb: number;
  relativeShapeDb: number;
  smoothedShapeDb: number;
  playbackFilterGainDb: number;
}

export interface PlaybackMappingResult {
  broadbandLossDb: number;
  outputGainLinear: number;
  outputGainDb: number;
  bands: PlaybackEqBand[];
}

const BROADBAND_WEIGHTS = new Map<number, number>([
  [31.5, 0.05],
  [63, 0.08],
  [125, 0.12],
  [250, 0.15],
  [500, 0.18],
  [1000, 0.18],
  [2000, 0.12],
  [4000, 0.07],
  [8000, 0.03],
  [16000, 0.02],
]);

const BAND_CLAMPS = new Map<number, { min: number; max: number }>([
  [31.5, { min: -6, max: 3 }],
  [63, { min: -8, max: 3 }],
  [125, { min: -10, max: 3 }],
  [250, { min: -12, max: 3 }],
  [500, { min: -12, max: 3 }],
  [1000, { min: -14, max: 3 }],
  [2000, { min: -16, max: 3 }],
  [4000, { min: -18, max: 3 }],
  [8000, { min: -18, max: 3 }],
  [16000, { min: -18, max: 3 }],
]);

const LIGHTWEIGHT_SINGLE_LEAF_CORRECTION = new Map<number, number>([
  [31.5, 0],
  [63, 0],
  [125, 0],
  [250, 0],
  [500, 0],
  [1000, -2],
  [2000, -4],
  [4000, -5],
  [8000, -5],
  [16000, -4],
]);

const MAX_BROADBAND_LOSS_DB = 42;
const MAX_ADJACENT_FILTER_JUMP_DB = 8;

export function mapTlToPlaybackEq(result: SimulationResult): PlaybackMappingResult {
  const broadbandLossDb = computeBroadbandLossDb(result.bands);
  const correctedShape = applyLightweightSingleLeafPlaybackCorrection(
    computeRelativeSpectralShapeDb(result.bands, broadbandLossDb),
    result,
  );
  const smoothedShapeDb = smoothBandCurve(correctedShape);
  const playbackFilterGainDb = limitAdjacentBandJumps(
    clampRelativeShapeByBand(result.bands, smoothedShapeDb),
    MAX_ADJACENT_FILTER_JUMP_DB,
  );

  return {
    broadbandLossDb,
    outputGainDb: -broadbandLossDb,
    outputGainLinear: dbToGain(-broadbandLossDb),
    bands: result.bands.map((band, index) => ({
      frequencyHz: band.frequencyHz,
      calculatedTlDb: band.attenuationDb,
      relativeShapeDb: correctedShape[index] ?? 0,
      smoothedShapeDb: smoothedShapeDb[index] ?? 0,
      playbackFilterGainDb: playbackFilterGainDb[index] ?? 0,
    })),
  };
}

export function computeBroadbandLossDb(tlBands: FrequencyBandResult[]): number {
  const weighted = tlBands.reduce(
    (state, band) => {
      const weight = BROADBAND_WEIGHTS.get(band.frequencyHz) ?? 0;
      return {
        total: state.total + Math.max(0, band.attenuationDb) * weight,
        weight: state.weight + weight,
      };
    },
    { total: 0, weight: 0 },
  );

  if (weighted.weight === 0) {
    return 0;
  }

  return round1(clamp(weighted.total / weighted.weight, 0, MAX_BROADBAND_LOSS_DB));
}

export function computeRelativeSpectralShapeDb(
  tlBands: FrequencyBandResult[],
  broadbandLossDb: number,
): number[] {
  return tlBands.map((band) => band.attenuationDb - broadbandLossDb);
}

export function smoothBandCurve(values: number[]): number[] {
  return values.map((value, index) => {
    const previous = values[index - 1] ?? value;
    const next = values[index + 1] ?? value;
    return round1((previous + value * 2 + next) / 4);
  });
}

export function clampRelativeShapeByBand(
  tlBands: FrequencyBandResult[],
  relativeShapeDb: number[],
): number[] {
  return tlBands.map((band, index) => {
    const shape = relativeShapeDb[index] ?? 0;
    const filterGainDb = -shape;
    const bandClamp = BAND_CLAMPS.get(band.frequencyHz) ?? { min: -12, max: 3 };
    return round1(clamp(filterGainDb, bandClamp.min, bandClamp.max));
  });
}

export function limitAdjacentBandJumps(values: number[], maxJumpDb: number): number[] {
  const forwardLimited = [...values];
  for (let index = 1; index < forwardLimited.length; index += 1) {
    const previous = forwardLimited[index - 1];
    forwardLimited[index] = clamp(forwardLimited[index], previous - maxJumpDb, previous + maxJumpDb);
  }

  const backwardLimited = [...forwardLimited];
  for (let index = backwardLimited.length - 2; index >= 0; index -= 1) {
    const next = backwardLimited[index + 1];
    backwardLimited[index] = round1(clamp(backwardLimited[index], next - maxJumpDb, next + maxJumpDb));
  }

  return backwardLimited;
}

export function applyLightweightSingleLeafPlaybackCorrection(
  relativeShapeDb: number[],
  result: SimulationResult,
): number[] {
  if (result.systemType !== "single_leaf" || result.totalSurfaceMassKgM2 >= 20) {
    return relativeShapeDb;
  }

  return result.bands.map((band, index) => {
    const correction = LIGHTWEIGHT_SINGLE_LEAF_CORRECTION.get(band.frequencyHz) ?? 0;
    return round1((relativeShapeDb[index] ?? 0) + correction);
  });
}

export function estimateCombinedFilterResponseAtBands(mapping: PlaybackMappingResult): PlaybackEqBand[] {
  return mapping.bands;
}

function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
