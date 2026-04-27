import { simulateConstruction } from "./acoustics";
import { designFirFilter } from "./fir";
import { mapTlToPlaybackEq, normalizePlaybackMappingForAudition } from "./playbackMapping";
import type { ConstructionLayer } from "../types";

interface ValidationScenario {
  id: string;
  label: string;
  layers: ConstructionLayer[];
}

interface ValidationResult {
  id: string;
  label: string;
  rawBroadbandLossDb: number;
  playbackBroadbandLossDb: number;
  maxAdjacentJumpDb: number;
  maxCutDb: number;
  maxFirErrorDb: number;
  impulseLength: number;
}

const scenarios: ValidationScenario[] = [
  {
    id: "single-gypsum",
    label: "Single gypsum board 12.5 mm",
    layers: [{ id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 }],
  },
  {
    id: "double-gypsum-direct",
    label: "Two gypsum boards directly bonded",
    layers: [
      { id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 },
      { id: "v2", materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "double-gypsum-empty-cavity",
    label: "Double gypsum + 70 mm empty cavity",
    layers: [
      { id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 },
      { id: "v2", materialId: "luchtspouw", thicknessMm: 70 },
      { id: "v3", materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "concrete-200",
    label: "Concrete wall 200 mm",
    layers: [{ id: "v1", materialId: "beton-zwaar", thicknessMm: 200 }],
  },
  {
    id: "extreme-concrete-500",
    label: "Extreme concrete wall 500 mm",
    layers: [{ id: "v1", materialId: "beton-zwaar", thicknessMm: 500 }],
  },
  {
    id: "double-gypsum-wool",
    label: "Double gypsum + cavity + mineral wool",
    layers: [
      { id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 },
      { id: "v2", materialId: "luchtspouw", thicknessMm: 70 },
      { id: "v3", materialId: "steenwol-middel", thicknessMm: 70 },
      { id: "v4", materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "triple-leaf-two-cavities",
    label: "Gypsum + cavity + gypsum + cavity + gypsum",
    layers: [
      { id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 },
      { id: "v2", materialId: "luchtspouw", thicknessMm: 70 },
      { id: "v3", materialId: "steenwol-middel", thicknessMm: 70 },
      { id: "v4", materialId: "gipsplaat", thicknessMm: 12.5 },
      { id: "v5", materialId: "luchtspouw", thicknessMm: 70 },
      { id: "v6", materialId: "steenwol-middel", thicknessMm: 70 },
      { id: "v7", materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "osb-gypsum",
    label: "OSB 12 mm + gypsum 12.5 mm bonded",
    layers: [
      { id: "v1", materialId: "osb", thicknessMm: 12 },
      { id: "v2", materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
];

export function runPlaybackMappingValidation(): ValidationResult[] {
  const results = scenarios.map((scenario) => {
    const simulation = simulateConstruction(scenario.layers);
    const mapping = mapTlToPlaybackEq(simulation);
    const firDesign = designFirFilter(mapping, 48000);
    const filterGains = mapping.bands.map((band) => band.playbackFilterGainDb);
    const adjacentJumps = filterGains.slice(1).map((gain, index) => Math.abs(gain - filterGains[index]));
    return {
      id: scenario.id,
      label: scenario.label,
      rawBroadbandLossDb: mapping.rawBroadbandLossDb,
      playbackBroadbandLossDb: mapping.playbackBroadbandLossDb,
      maxAdjacentJumpDb: Math.max(0, ...adjacentJumps),
      maxCutDb: Math.max(0, ...filterGains.map((gain) => Math.abs(Math.min(0, gain)))),
      maxFirErrorDb: Math.max(0, ...firDesign.bandChecks.map((check) => Math.abs(check.errorDb))),
      impulseLength: firDesign.impulseLength,
    };
  });

  const byId = new Map(results.map((result) => [result.id, result]));
  const singleGypsum = requireResult(byId, "single-gypsum");
  const doubleGypsumDirect = requireResult(byId, "double-gypsum-direct");
  const doubleGypsumEmptyCavity = requireResult(byId, "double-gypsum-empty-cavity");
  const osbGypsum = requireResult(byId, "osb-gypsum");
  const doubleGypsumWool = requireResult(byId, "double-gypsum-wool");
  const tripleLeafTwoCavities = requireResult(byId, "triple-leaf-two-cavities");
  const concrete = requireResult(byId, "concrete-200");
  const extremeConcrete = requireResult(byId, "extreme-concrete-500");

  assert(
    singleGypsum.playbackBroadbandLossDb < doubleGypsumDirect.playbackBroadbandLossDb,
    "Expected single gypsum to have less broadband loss than double gypsum direct.",
  );
  assert(
    osbGypsum.playbackBroadbandLossDb < doubleGypsumWool.playbackBroadbandLossDb,
    "Expected bonded OSB + gypsum to have less broadband loss than double gypsum cavity.",
  );
  assert(
    doubleGypsumDirect.playbackBroadbandLossDb < doubleGypsumWool.playbackBroadbandLossDb,
    "Expected double gypsum cavity to outperform directly bonded double gypsum.",
  );
  assert(
    doubleGypsumWool.playbackBroadbandLossDb < concrete.playbackBroadbandLossDb,
    "Expected double gypsum cavity to have less broadband loss than concrete 200 mm.",
  );
  assert(
    concrete.playbackBroadbandLossDb < extremeConcrete.playbackBroadbandLossDb,
    "Expected extreme concrete to have more playback broadband loss than concrete 200 mm.",
  );
  assert(singleGypsum.playbackBroadbandLossDb >= 10, "Single gypsum playback loss should still be audible.");
  assert(singleGypsum.playbackBroadbandLossDb <= 18, "Single gypsum playback loss should remain modest.");
  assert(osbGypsum.playbackBroadbandLossDb >= 15 && osbGypsum.playbackBroadbandLossDb <= 24, "OSB + gypsum playback loss is outside target sanity range.");
  assert(doubleGypsumWool.playbackBroadbandLossDb >= 20 && doubleGypsumWool.playbackBroadbandLossDb <= 32, "Double gypsum cavity playback loss is outside target sanity range.");
  assert(
    tripleLeafTwoCavities.playbackBroadbandLossDb >= doubleGypsumWool.playbackBroadbandLossDb,
    "Triple leaf two-cavity playback loss should not underperform the two-leaf filled cavity in this simplified model.",
  );
  assert(
    tripleLeafTwoCavities.playbackBroadbandLossDb <= concrete.playbackBroadbandLossDb,
    "Triple leaf two-cavity playback loss should stay below concrete 200 mm in playback scaling.",
  );
  assert(concrete.playbackBroadbandLossDb >= 30, "Concrete 200 mm should have high playback loss.");
  assert(
    concrete.playbackBroadbandLossDb - singleGypsum.playbackBroadbandLossDb >= 8,
    "Concrete should be at least 8 dB above single gypsum in playback broadband loss.",
  );
  assert(
    concrete.playbackBroadbandLossDb - doubleGypsumWool.playbackBroadbandLossDb >= 4,
    "Concrete should stay meaningfully above double gypsum cavity in playback broadband loss.",
  );
  assert(extremeConcrete.playbackBroadbandLossDb >= 48, "Extreme concrete should approach near-silence.");
  assertMassSpringMassCalibration();
  assertExtremeAuditionComparison();
  assertMultiLeafMassSpringMassDetection();

  results.forEach((result) => {
    assert(result.maxCutDb <= 18, `${result.label} exceeded configured playback EQ clamp.`);
    assert(result.maxAdjacentJumpDb <= 8, `${result.label} has a wild adjacent-band playback jump.`);
    assert(result.maxFirErrorDb <= 4, `${result.label} FIR response diverged too far from target.`);
    assert(result.impulseLength >= 1025, `${result.label} FIR impulse is unexpectedly short.`);
  });

  return results;
}

function assertMultiLeafMassSpringMassDetection(): void {
  const tripleLeaf = simulateConstruction([
    { id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 },
    { id: "v2", materialId: "luchtspouw", thicknessMm: 70 },
    { id: "v3", materialId: "steenwol-middel", thicknessMm: 70 },
    { id: "v4", materialId: "gipsplaat", thicknessMm: 12.5 },
    { id: "v5", materialId: "luchtspouw", thicknessMm: 70 },
    { id: "v6", materialId: "steenwol-middel", thicknessMm: 70 },
    { id: "v7", materialId: "gipsplaat", thicknessMm: 12.5 },
  ]);

  assert(
    tripleLeaf.systemType === "mass_spring_mass_spring_mass",
    "Expected two separated cavities to be classified as mass-spring-mass-spring-mass.",
  );
  assert(tripleLeaf.leafMassesKgM2?.length === 3, "Expected triple leaf system to expose three leaf masses.");
  assert(tripleLeaf.cavityThicknessesMm?.length === 2, "Expected triple leaf system to expose two cavity thicknesses.");
  assert(
    tripleLeaf.resonanceFrequenciesHz?.length === 2,
    "Expected triple leaf system to expose one resonance estimate per cavity.",
  );
}

function assertExtremeAuditionComparison(): void {
  const referenceMapping = mapTlToPlaybackEq(
    simulateConstruction([{ id: "v1", materialId: "baksteen", thicknessMm: 100 }]),
  );
  const extremeAudition = normalizePlaybackMappingForAudition(
    mapTlToPlaybackEq(simulateConstruction([{ id: "v2", materialId: "baksteen", thicknessMm: 5000 }])),
    referenceMapping,
  );

  const lowBand = playbackAttenuationAt(extremeAudition, 125);
  const speechMidBand = playbackAttenuationAt(extremeAudition, 1000);
  const speechHighBand = playbackAttenuationAt(extremeAudition, 4000);
  assert(
    speechHighBand - lowBand >= 25,
    "Extreme audition comparison should not normalize high-frequency speech detail back into audibility.",
  );
  assert(
    speechMidBand >= 55,
    "Extreme audition comparison should keep thick masonry strongly attenuated around 1 kHz speech energy.",
  );
  assert(
    speechHighBand >= 55,
    "Extreme audition comparison should keep thick masonry strongly attenuated in speech-detail bands.",
  );
}

function assertMassSpringMassCalibration(): void {
  const direct = simulateConstruction([
    { id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 },
    { id: "v2", materialId: "gipsplaat", thicknessMm: 12.5 },
  ]);
  const emptyCavity = simulateConstruction([
    { id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 },
    { id: "v2", materialId: "luchtspouw", thicknessMm: 70 },
    { id: "v3", materialId: "gipsplaat", thicknessMm: 12.5 },
  ]);
  const filledCavity = simulateConstruction([
    { id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 },
    { id: "v2", materialId: "luchtspouw", thicknessMm: 70 },
    { id: "v3", materialId: "steenwol-middel", thicknessMm: 70 },
    { id: "v4", materialId: "gipsplaat", thicknessMm: 12.5 },
  ]);

  const emptyResonanceHz = emptyCavity.estimatedResonanceHz;
  const filledResonanceHz = filledCavity.estimatedResonanceHz;
  if (emptyResonanceHz === undefined || filledResonanceHz === undefined) {
    throw new Error("[playback mapping validation] Expected cavity scenarios to expose resonance frequency.");
  }
  assert(
    emptyResonanceHz >= 90 && emptyResonanceHz <= 120,
    "Expected 2x gypsum + 70 mm cavity resonance to land around 90-120 Hz.",
  );
  assert(Math.abs(filledResonanceHz - emptyResonanceHz) < 1, "Mineral wool should not change the mass-air-mass resonance frequency.");

  const empty125 = attenuationAt(emptyCavity, 125);
  const filled125 = attenuationAt(filledCavity, 125);
  const direct125 = attenuationAt(direct, 125);
  assert(empty125 < direct125, "Empty cavity should still show resonance weakness near 125 Hz.");
  assert(filled125 > empty125, "Mineral wool should reduce the resonance dip near 125 Hz.");

  [250, 500, 1000, 2000, 4000].forEach((frequencyHz) => {
    assert(
      attenuationAt(emptyCavity, frequencyHz) > attenuationAt(direct, frequencyHz) + 3,
      `Empty cavity should outperform direct boards at ${frequencyHz} Hz.`,
    );
    assert(
      attenuationAt(filledCavity, frequencyHz) >= attenuationAt(emptyCavity, frequencyHz),
      `Mineral wool should not reduce above-resonance attenuation at ${frequencyHz} Hz.`,
    );
  });
}

function attenuationAt(result: ReturnType<typeof simulateConstruction>, frequencyHz: number): number {
  const band = result.bands.find((item) => item.frequencyHz === frequencyHz);
  if (!band) {
    throw new Error(`Missing frequency band ${frequencyHz}`);
  }
  return band.attenuationDb;
}

function requireResult(results: Map<string, ValidationResult>, id: string): ValidationResult {
  const result = results.get(id);
  if (!result) {
    throw new Error(`Missing validation scenario: ${id}`);
  }
  return result;
}

function playbackAttenuationAt(result: ReturnType<typeof mapTlToPlaybackEq>, frequencyHz: number): number {
  const band = result.bands.find((item) => item.frequencyHz === frequencyHz);
  if (!band) {
    throw new Error(`Missing playback frequency band ${frequencyHz}`);
  }
  return band.playbackAttenuationDb;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[playback mapping validation] ${message}`);
  }
}
