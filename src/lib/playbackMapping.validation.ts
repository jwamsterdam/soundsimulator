import { simulateConstruction } from "./acoustics";
import { mapTlToPlaybackEq } from "./playbackMapping";
import type { ConstructionLayer } from "../types";

interface ValidationScenario {
  id: string;
  label: string;
  layers: ConstructionLayer[];
}

interface ValidationResult {
  id: string;
  label: string;
  broadbandLossDb: number;
  maxAdjacentJumpDb: number;
  maxCutDb: number;
}

const scenarios: ValidationScenario[] = [
  {
    id: "single-gypsum",
    label: "Single gypsum board 12.5 mm",
    layers: [{ id: "v1", materialId: "gipsplaat", thicknessMm: 12.5 }],
  },
  {
    id: "concrete-200",
    label: "Concrete wall 200 mm",
    layers: [{ id: "v1", materialId: "beton-zwaar", thicknessMm: 200 }],
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
    const filterGains = mapping.bands.map((band) => band.playbackFilterGainDb);
    const adjacentJumps = filterGains.slice(1).map((gain, index) => Math.abs(gain - filterGains[index]));
    return {
      id: scenario.id,
      label: scenario.label,
      broadbandLossDb: mapping.broadbandLossDb,
      maxAdjacentJumpDb: Math.max(0, ...adjacentJumps),
      maxCutDb: Math.max(0, ...filterGains.map((gain) => Math.abs(Math.min(0, gain)))),
    };
  });

  const byId = new Map(results.map((result) => [result.id, result]));
  const singleGypsum = requireResult(byId, "single-gypsum");
  const osbGypsum = requireResult(byId, "osb-gypsum");
  const doubleGypsumWool = requireResult(byId, "double-gypsum-wool");
  const concrete = requireResult(byId, "concrete-200");

  assert(
    singleGypsum.broadbandLossDb < osbGypsum.broadbandLossDb,
    "Expected single gypsum to have less broadband loss than bonded OSB + gypsum.",
  );
  assert(
    osbGypsum.broadbandLossDb < doubleGypsumWool.broadbandLossDb,
    "Expected bonded OSB + gypsum to have less broadband loss than double gypsum cavity.",
  );
  assert(
    doubleGypsumWool.broadbandLossDb < concrete.broadbandLossDb,
    "Expected double gypsum cavity to have less broadband loss than concrete 200 mm.",
  );
  assert(singleGypsum.broadbandLossDb < 28, "Single gypsum broadband loss should remain modest.");
  assert(concrete.broadbandLossDb > 38, "Concrete 200 mm should have high broadband loss.");

  results.forEach((result) => {
    assert(result.maxCutDb <= 18, `${result.label} exceeded configured playback EQ clamp.`);
    assert(result.maxAdjacentJumpDb <= 8, `${result.label} has a wild adjacent-band playback jump.`);
  });

  return results;
}

function requireResult(results: Map<string, ValidationResult>, id: string): ValidationResult {
  const result = results.get(id);
  if (!result) {
    throw new Error(`Missing validation scenario: ${id}`);
  }
  return result;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[playback mapping validation] ${message}`);
  }
}
