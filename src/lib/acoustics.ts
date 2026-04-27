import { materialById } from "../data/materials";
import type { ConstructionLayer, FrequencyBandResult, Material, SimulationResult } from "../types";

export const FREQUENCY_BANDS_HZ = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

const MASS_LAW_OFFSET_DB = 47;
const MIN_TL_DB = 1;
const MAX_TL_DB = 86;
const AIR_DENSITY_KG_M3 = 1.2;
const SPEED_OF_SOUND_M_S = 343;
const MASS_AIR_MASS_RESONANCE_CONSTANT =
  Math.sqrt(AIR_DENSITY_KG_M3 * SPEED_OF_SOUND_M_S * SPEED_OF_SOUND_M_S) / (2 * Math.PI);

type ResolvedLayer = ConstructionLayer & { material: Material };

interface Leaf {
  massKgM2: number;
  lossFactor: number;
}

interface CavitySystem {
  leftLeaf: Leaf;
  rightLeaf: Leaf;
  cavityThicknessMm: number;
  fills: ResolvedLayer[];
  before: ResolvedLayer[];
  after: ResolvedLayer[];
}

interface DecoupledCavity {
  thicknessMm: number;
  fills: ResolvedLayer[];
}

interface DecoupledLeafChain {
  leaves: Leaf[];
  cavities: DecoupledCavity[];
  before: ResolvedLayer[];
  after: ResolvedLayer[];
}

export function simulateConstruction(layers: ConstructionLayer[]): SimulationResult {
  const resolvedLayers = resolveLayers(layers);
  const warnings: string[] = [];

  if (resolvedLayers.length === 0) {
    warnings.push("Voeg minimaal een laag toe om een simulatie te maken.");
    return emptyResult(warnings);
  }

  const decoupledSystem = detectDecoupledLeafChain(resolvedLayers);
  if (decoupledSystem) {
    if (decoupledSystem.cavities.length === 1) {
      return simulateMassSpringMass(
        {
          leftLeaf: decoupledSystem.leaves[0],
          rightLeaf: decoupledSystem.leaves[1],
          cavityThicknessMm: decoupledSystem.cavities[0].thicknessMm,
          fills: decoupledSystem.cavities[0].fills,
          before: decoupledSystem.before,
          after: decoupledSystem.after,
        },
        warnings,
      );
    }

    return simulateMultiLeafMassSpringMass(decoupledSystem, warnings);
  }

  const massLayers = resolvedLayers.filter(isMassLayer);
  const hasPorousFill = resolvedLayers.some((layer) => layer.material.type === "porous_fill");
  const hasAirGap = resolvedLayers.some((layer) => layer.material.type === "air_gap");

  if (massLayers.length === 0) {
    warnings.push("Deze opbouw bevat geen effectieve massieve bladlaag.");
    return emptyResult(warnings);
  }

  if (hasPorousFill) {
    warnings.push("Porous fill buiten een gedetecteerde spouw is niet als zelfstandige barriere meegenomen.");
  }

  if (hasAirGap) {
    warnings.push("Spouw gedetecteerd, maar geen volledig massa-veer-massa patroon gevonden.");
  }

  const equivalentLeaf = makeLeaf(massLayers);
  const systemType = massLayers.length === 1 ? "single_leaf" : "bonded_mass";
  const dissimilarBonus = massLayers.length > 1 ? calculateDissimilarBonus(massLayers) : 0;

  const bands = FREQUENCY_BANDS_HZ.map<FrequencyBandResult>((frequencyHz) => {
    const baseTl = calculateMassLawTL(equivalentLeaf.massKgM2, equivalentLeaf.lossFactor, frequencyHz);
    const lowFrequencyPenalty = equivalentLeaf.massKgM2 < 18 && frequencyHz <= 125 ? 3 : 0;
    return {
      frequencyHz,
      attenuationDb: clampDb(baseTl + dissimilarBonus - lowFrequencyPenalty),
      notes: [systemType === "single_leaf" ? "Massawet enkel blad" : "Equivalente massa direct gekoppelde lagen"],
    };
  });

  return {
    bands,
    systemType,
    totalSurfaceMassKgM2: equivalentLeaf.massKgM2,
    hasPorousFill,
    warnings,
  };
}

export function calculateSingleLeafTL(material: Material, thicknessMm: number, frequencyHz: number): number {
  if (!material.density) {
    return 0;
  }

  const massKgM2 = surfaceMass(material, thicknessMm);
  return calculateMassLawTL(massKgM2, material.lossFactor ?? 0.03, frequencyHz);
}

export function getPorousFillEffect(
  fills: ResolvedLayer[],
  frequencyHz: number,
  resonanceHz: number,
): { resonancePenaltyReductionDb: number; aboveResonanceBonusDb: number } {
  if (fills.length === 0) {
    return { resonancePenaltyReductionDb: 0, aboveResonanceBonusDb: 0 };
  }

  const averageFlow = average(fills.map((fill) => fill.material.flowResistivity ?? 5000));
  const normalizedFlow = clamp((averageFlow - 4000) / 12000, 0, 1);
  const fillThicknessFactor = clamp(sum(fills.map((fill) => fill.thicknessMm)) / 100, 0.25, 1.2);
  const aboveResonanceFactor = clamp(Math.log2(Math.max(frequencyHz / resonanceHz, 1)), 0, 3) / 3;

  return {
    resonancePenaltyReductionDb: 4 + normalizedFlow * 2,
    aboveResonanceBonusDb: clamp((2 + normalizedFlow * 3) * fillThicknessFactor * aboveResonanceFactor, 0, 4),
  };
}

function simulateMassSpringMass(system: CavitySystem, warnings: string[]): SimulationResult {
  const { leftLeaf, rightLeaf, cavityThicknessMm, fills, before, after } = system;
  const cavityM = Math.max(cavityThicknessMm / 1000, 0.01);
  const resonanceHz = calculateMassAirMassResonanceHz(leftLeaf.massKgM2, rightLeaf.massKgM2, cavityM);
  const extraMass = makeLeaf([...before, ...after]).massKgM2;
  const combinedMass = leftLeaf.massKgM2 + rightLeaf.massKgM2 + extraMass;
  const hasPorousFill = fills.length > 0;

  if (before.length > 0 || after.length > 0) {
    warnings.push("Extra massieve lagen buiten de hoofdcaviteit zijn als gekoppelde massa meegenomen.");
  }

  const bands = FREQUENCY_BANDS_HZ.map<FrequencyBandResult>((frequencyHz) => {
    const equivalentMassTl = calculateMassLawTL(
      combinedMass,
      average([leftLeaf.lossFactor, rightLeaf.lossFactor]),
      frequencyHz,
    );
    const decoupledGain = calculateDecoupledGain(frequencyHz, resonanceHz, hasPorousFill);
    const resonancePenalty = calculateResonancePenalty(frequencyHz, resonanceHz, hasPorousFill);
    const fillEffect = getPorousFillEffect(fills, frequencyHz, resonanceHz);
    const belowResonancePenalty = frequencyHz < resonanceHz ? clamp(Math.log2(resonanceHz / frequencyHz), 0, 3) * 2.5 : 0;

    const attenuationDb =
      equivalentMassTl +
      decoupledGain +
      fillEffect.aboveResonanceBonusDb -
      Math.max(0, resonancePenalty - fillEffect.resonancePenaltyReductionDb) -
      belowResonancePenalty;

    return {
      frequencyHz,
      attenuationDb: clampDb(attenuationDb),
      notes: [
        "Massa-veer-massa heuristiek",
        hasPorousFill ? "Spouwdemping door porous fill" : "Lege spouw met diepere resonantiedip",
      ],
    };
  });

  return {
    bands,
    systemType: "mass_spring_mass",
    estimatedResonanceHz: resonanceHz,
    resonanceFrequenciesHz: [resonanceHz],
    totalSurfaceMassKgM2: combinedMass,
    leafMassesKgM2: [leftLeaf.massKgM2, rightLeaf.massKgM2],
    cavityThicknessMm,
    cavityThicknessesMm: [cavityThicknessMm],
    hasPorousFill,
    warnings,
  };
}

function simulateMultiLeafMassSpringMass(system: DecoupledLeafChain, warnings: string[]): SimulationResult {
  const { leaves, cavities, before, after } = system;
  const leafMasses = leaves.map((leaf) => leaf.massKgM2);
  const resonanceFrequencies = cavities.map((cavity, index) =>
    calculateMassAirMassResonanceHz(
      leaves[index].massKgM2,
      leaves[index + 1].massKgM2,
      Math.max(cavity.thicknessMm / 1000, 0.01),
    ),
  );
  const extraMass = makeLeaf([...before, ...after]).massKgM2;
  const combinedMass = sum(leafMasses) + extraMass;
  const hasPorousFill = cavities.some((cavity) => cavity.fills.length > 0);
  const averageLoss = average(leaves.map((leaf) => leaf.lossFactor));
  const primaryResonanceHz = Math.min(...resonanceFrequencies);

  if (before.length > 0 || after.length > 0) {
    warnings.push("Extra massieve lagen buiten de gedetecteerde ontkoppelde keten zijn als gekoppelde massa meegenomen.");
  }

  const bands = FREQUENCY_BANDS_HZ.map<FrequencyBandResult>((frequencyHz) => {
    const equivalentMassTl = calculateMassLawTL(combinedMass, averageLoss, frequencyHz);
    const cavityEffects = cavities.map((cavity, index) => {
      const resonanceHz = resonanceFrequencies[index];
      const fillEffect = getPorousFillEffect(cavity.fills, frequencyHz, resonanceHz);
      return {
        decoupledGain: calculateDecoupledGain(frequencyHz, resonanceHz, cavity.fills.length > 0),
        resonancePenalty: calculateResonancePenalty(frequencyHz, resonanceHz, cavity.fills.length > 0),
        fillEffect,
        belowResonancePenalty:
          frequencyHz < resonanceHz ? clamp(Math.log2(resonanceHz / frequencyHz), 0, 3) * 1.8 : 0,
      };
    });

    const decoupledGain = clamp(sum(cavityEffects.map((effect) => effect.decoupledGain)) * 0.72, 0, 24);
    const fillBonus = clamp(sum(cavityEffects.map((effect) => effect.fillEffect.aboveResonanceBonusDb)) * 0.75, 0, 7);
    const resonancePenalty = Math.max(
      0,
      ...cavityEffects.map((effect) => effect.resonancePenalty - effect.fillEffect.resonancePenaltyReductionDb),
    );
    const belowResonancePenalty = Math.max(0, ...cavityEffects.map((effect) => effect.belowResonancePenalty));
    const multiLeafCouplingPenalty = frequencyHz <= primaryResonanceHz * 1.4 ? 1.5 : 0;

    return {
      frequencyHz,
      attenuationDb: clampDb(
        equivalentMassTl + decoupledGain + fillBonus - resonancePenalty - belowResonancePenalty - multiLeafCouplingPenalty,
      ),
      notes: [
        "Massa-veer-massa-veer-massa heuristiek",
        hasPorousFill ? "Spouwdemping in een of meer spouwen" : "Lege spouwen met diepere resonantiedips",
      ],
    };
  });

  return {
    bands,
    systemType: "mass_spring_mass_spring_mass",
    estimatedResonanceHz: primaryResonanceHz,
    resonanceFrequenciesHz: resonanceFrequencies,
    totalSurfaceMassKgM2: combinedMass,
    leafMassesKgM2: leafMasses,
    cavityThicknessMm: cavities[0]?.thicknessMm,
    cavityThicknessesMm: cavities.map((cavity) => cavity.thicknessMm),
    hasPorousFill,
    warnings,
  };
}

function detectDecoupledLeafChain(layers: ResolvedLayer[]): DecoupledLeafChain | undefined {
  for (let startIndex = 0; startIndex < layers.length; startIndex += 1) {
    if (!isMassLayer(layers[startIndex])) {
      continue;
    }

    const firstLeafLayers = collectMassBlock(layers, startIndex, 1);
    const leaves = [makeLeaf(firstLeafLayers)];
    const cavities: DecoupledCavity[] = [];
    let index = startIndex + firstLeafLayers.length;

    while (index < layers.length && layers[index].material.type === "air_gap") {
      const airGap = layers[index];
      const rightStart = skipPorousFill(layers, index + 1);
      const rightLayers = collectMassBlock(layers, rightStart, 1);
      const fills = layers.slice(index + 1, rightStart).filter((layer) => layer.material.type === "porous_fill");

      if (rightLayers.length === 0) {
        break;
      }

      cavities.push({ thicknessMm: airGap.thicknessMm, fills });
      leaves.push(makeLeaf(rightLayers));
      index = rightStart + rightLayers.length;
    }

    if (cavities.length > 0) {
      return {
        leaves,
        cavities,
        before: layers.slice(0, startIndex).filter(isMassLayer),
        after: layers.slice(index).filter(isMassLayer),
      };
    }
  }

  return undefined;
}

function collectMassBlock(layers: ResolvedLayer[], startIndex: number, direction: 1 | -1): ResolvedLayer[] {
  const block: ResolvedLayer[] = [];
  for (let index = startIndex; index >= 0 && index < layers.length; index += direction) {
    const layer = layers[index];
    if (!isMassLayer(layer)) {
      break;
    }
    block.push(layer);
  }

  return direction === -1 ? block.reverse() : block;
}

function skipPorousFill(layers: ResolvedLayer[], startIndex: number): number {
  let index = startIndex;
  while (index < layers.length && layers[index].material.type === "porous_fill") {
    index += 1;
  }
  return index;
}

function resolveLayers(layers: ConstructionLayer[]): ResolvedLayer[] {
  return layers
    .map((layer) => {
      const material = materialById.get(layer.materialId);
      return material ? { ...layer, material } : undefined;
    })
    .filter((layer): layer is ResolvedLayer => Boolean(layer));
}

function isMassLayer(layer: ResolvedLayer): boolean {
  return layer.material.type === "solid_panel" || layer.material.type === "thin_layer";
}

function makeLeaf(layers: ResolvedLayer[]): Leaf {
  const massKgM2 = sum(layers.map((layer) => surfaceMass(layer.material, layer.thicknessMm)));
  const weightedLoss =
    massKgM2 > 0
      ? sum(layers.map((layer) => surfaceMass(layer.material, layer.thicknessMm) * (layer.material.lossFactor ?? 0.03))) /
        massKgM2
      : 0.03;

  return { massKgM2, lossFactor: weightedLoss };
}

function surfaceMass(material: Material, thicknessMm: number): number {
  return (material.density ?? 0) * (thicknessMm / 1000);
}

function calculateMassLawTL(massKgM2: number, lossFactor: number, frequencyHz: number): number {
  if (massKgM2 <= 0 || frequencyHz <= 0) {
    return 0;
  }

  const massLaw = 20 * Math.log10(massKgM2 * frequencyHz) - MASS_LAW_OFFSET_DB;
  const dampingBonus = clamp(Math.log10(Math.max(lossFactor, 0.005) / 0.02) * 2, -2, 4);
  const heavyMassBonus = massKgM2 > 120 ? Math.min(5, Math.log10(massKgM2 / 120) * 8) : 0;
  return clamp(massLaw + dampingBonus + heavyMassBonus, MIN_TL_DB, MAX_TL_DB);
}

function calculateDecoupledGain(frequencyHz: number, resonanceHz: number, hasPorousFill: boolean): number {
  if (frequencyHz <= resonanceHz) {
    return 0;
  }

  const octavesAbove = Math.log2(frequencyHz / resonanceHz);
  const baseGain = clamp(octavesAbove * 3.8, 0, 14);
  return hasPorousFill ? baseGain + clamp(octavesAbove * 1.1, 0, 4) : baseGain;
}

function calculateResonancePenalty(frequencyHz: number, resonanceHz: number, hasPorousFill: boolean): number {
  const octavesFromResonance = Math.abs(Math.log2(frequencyHz / resonanceHz));
  const width = hasPorousFill ? 0.9 : 0.75;
  const proximity = Math.max(0, 1 - octavesFromResonance / width);
  return proximity * (hasPorousFill ? 5 : 10);
}

function calculateMassAirMassResonanceHz(m1KgM2: number, m2KgM2: number, cavityM: number): number {
  // Air-cavity stiffness per area is rho*c^2/d. With d in meters and leaf
  // masses in kg/m2, the resulting constant is about 60, not 160.
  return MASS_AIR_MASS_RESONANCE_CONSTANT * Math.sqrt((1 / cavityM) * (1 / m1KgM2 + 1 / m2KgM2));
}

function calculateDissimilarBonus(layers: ResolvedLayer[]): number {
  const densities = layers.map((layer) => layer.material.density ?? 0).filter(Boolean);
  if (densities.length < 2) {
    return 0;
  }

  const spread = Math.max(...densities) / Math.max(1, Math.min(...densities));
  return clamp(Math.log2(spread) * 1.2, 0, 3);
}

function emptyResult(warnings: string[]): SimulationResult {
  return {
    bands: FREQUENCY_BANDS_HZ.map((frequencyHz) => ({ frequencyHz, attenuationDb: 0 })),
    systemType: "mixed_or_ambiguous",
    totalSurfaceMassKgM2: 0,
    hasPorousFill: false,
    warnings,
  };
}

function clampDb(value: number): number {
  return Math.round(clamp(value, MIN_TL_DB, MAX_TL_DB) * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number {
  return values.length > 0 ? sum(values) / values.length : 0;
}
