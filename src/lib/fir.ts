import type { PlaybackMappingResult } from "./playbackMapping";

export interface TransferCurvePoint {
  frequencyHz: number;
  attenuationDb: number;
  magnitude: number;
}

export interface FirBandCheck {
  frequencyHz: number;
  targetAttenuationDb: number;
  achievedAttenuationDb: number;
  errorDb: number;
}

export interface FirDesignResult {
  cacheKey: string;
  sampleRate: number;
  impulseLength: number;
  mode: "linear-phase-windowed-frequency-sampling";
  impulse: Float32Array;
  denseTransferCurve: TransferCurvePoint[];
  bandChecks: FirBandCheck[];
}

const DEFAULT_IMPULSE_LENGTH = 1025;
const DENSE_POINT_COUNT = 192;
const MIN_FREQUENCY_HZ = 20;
const designCache = new Map<string, FirDesignResult>();

export function designFirFilter(
  mapping: PlaybackMappingResult,
  sampleRate: number,
  impulseLength = DEFAULT_IMPULSE_LENGTH,
): FirDesignResult {
  const oddImpulseLength = impulseLength % 2 === 0 ? impulseLength + 1 : impulseLength;
  const cacheKey = createFirCacheKey(mapping, sampleRate, oddImpulseLength);
  const cached = designCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const denseTransferCurve = buildDenseTransferCurve(mapping, sampleRate, DENSE_POINT_COUNT);
  const impulse = synthesizeLinearPhaseFir(denseTransferCurve, sampleRate, oddImpulseLength);
  const bandChecks = mapping.bands.map((band) => {
    const achievedAttenuationDb = measureFirAttenuationDb(impulse, sampleRate, band.frequencyHz);
    return {
      frequencyHz: band.frequencyHz,
      targetAttenuationDb: band.playbackAttenuationDb,
      achievedAttenuationDb,
      errorDb: round1(achievedAttenuationDb - band.playbackAttenuationDb),
    };
  });

  const result: FirDesignResult = {
    cacheKey,
    sampleRate,
    impulseLength: oddImpulseLength,
    mode: "linear-phase-windowed-frequency-sampling",
    impulse,
    denseTransferCurve,
    bandChecks,
  };
  designCache.set(cacheKey, result);
  return result;
}

export function createFirCacheKey(
  mapping: PlaybackMappingResult,
  sampleRate: number,
  impulseLength = DEFAULT_IMPULSE_LENGTH,
): string {
  const bandKey = mapping.bands
    .map((band) => `${band.frequencyHz}:${band.playbackAttenuationDb.toFixed(2)}`)
    .join("|");
  return `${sampleRate}:${impulseLength}:${mapping.playbackBroadbandLossDb.toFixed(2)}:${bandKey}`;
}

export function buildDenseTransferCurve(
  mapping: PlaybackMappingResult,
  sampleRate: number,
  pointCount = DENSE_POINT_COUNT,
): TransferCurvePoint[] {
  const nyquist = sampleRate / 2;
  const maxFrequency = Math.min(nyquist, 20000);
  const points: TransferCurvePoint[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    const t = index / (pointCount - 1);
    const frequencyHz = MIN_FREQUENCY_HZ * (maxFrequency / MIN_FREQUENCY_HZ) ** t;
    const attenuationDb = interpolateAttenuationDb(mapping, frequencyHz);
    points.push({
      frequencyHz: round1(frequencyHz),
      attenuationDb,
      magnitude: dbToMagnitude(-attenuationDb),
    });
  }
  return points;
}

export function interpolateAttenuationDb(mapping: PlaybackMappingResult, frequencyHz: number): number {
  const bands = mapping.bands;
  if (bands.length === 0) {
    return 0;
  }

  if (frequencyHz <= bands[0].frequencyHz) {
    return bands[0].playbackAttenuationDb;
  }

  const lastBand = bands[bands.length - 1];
  if (frequencyHz >= lastBand.frequencyHz) {
    return lastBand.playbackAttenuationDb;
  }

  for (let index = 0; index < bands.length - 1; index += 1) {
    const left = bands[index];
    const right = bands[index + 1];
    if (frequencyHz >= left.frequencyHz && frequencyHz <= right.frequencyHz) {
      const span = Math.log2(right.frequencyHz / left.frequencyHz);
      const position = Math.log2(frequencyHz / left.frequencyHz) / span;
      return round1(lerp(left.playbackAttenuationDb, right.playbackAttenuationDb, smoothstep(position)));
    }
  }

  return lastBand.playbackAttenuationDb;
}

export function measureFirAttenuationDb(impulse: Float32Array, sampleRate: number, frequencyHz: number): number {
  let real = 0;
  let imaginary = 0;
  const angularFrequency = (2 * Math.PI * frequencyHz) / sampleRate;
  for (let index = 0; index < impulse.length; index += 1) {
    real += impulse[index] * Math.cos(-angularFrequency * index);
    imaginary += impulse[index] * Math.sin(-angularFrequency * index);
  }
  const magnitude = Math.max(1e-8, Math.hypot(real, imaginary));
  return round1(-20 * Math.log10(magnitude));
}

function synthesizeLinearPhaseFir(
  denseTransferCurve: TransferCurvePoint[],
  sampleRate: number,
  impulseLength: number,
): Float32Array {
  const impulse = new Float32Array(impulseLength);
  const center = (impulseLength - 1) / 2;
  const integrationBins = 1024;

  for (let n = 0; n < impulseLength; n += 1) {
    const shiftedIndex = n - center;
    let value = 0;
    for (let bin = 0; bin <= integrationBins; bin += 1) {
      const frequencyHz = (sampleRate / 2) * (bin / integrationBins);
      const magnitude = interpolateDenseMagnitude(denseTransferCurve, frequencyHz);
      const weight = bin === 0 || bin === integrationBins ? 0.5 : 1;
      value += weight * magnitude * Math.cos((2 * Math.PI * frequencyHz * shiftedIndex) / sampleRate);
    }
    impulse[n] = (1 / integrationBins) * value * blackmanWindow(n, impulseLength);
  }

  return impulse;
}

function interpolateDenseMagnitude(curve: TransferCurvePoint[], frequencyHz: number): number {
  if (curve.length === 0) {
    return 1;
  }
  if (frequencyHz <= curve[0].frequencyHz) {
    return curve[0].magnitude;
  }
  const last = curve[curve.length - 1];
  if (frequencyHz >= last.frequencyHz) {
    return last.magnitude;
  }

  for (let index = 0; index < curve.length - 1; index += 1) {
    const left = curve[index];
    const right = curve[index + 1];
    if (frequencyHz >= left.frequencyHz && frequencyHz <= right.frequencyHz) {
      const position = (Math.log2(frequencyHz) - Math.log2(left.frequencyHz)) /
        (Math.log2(right.frequencyHz) - Math.log2(left.frequencyHz));
      return lerp(left.magnitude, right.magnitude, position);
    }
  }

  return last.magnitude;
}

function blackmanWindow(index: number, length: number): number {
  const phase = (2 * Math.PI * index) / (length - 1);
  return 0.42 - 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase);
}

function dbToMagnitude(db: number): number {
  return 10 ** (db / 20);
}

function lerp(left: number, right: number, position: number): number {
  return left + (right - left) * position;
}

function smoothstep(position: number): number {
  return position * position * (3 - 2 * position);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
