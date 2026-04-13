import type { ConstructionLayer } from "../types";

export interface ConstructionOption {
  id: string;
  name: string;
  description: string;
  textureClassName: string;
  layers: Omit<ConstructionLayer, "id">[];
}

export const currentWallOptions: ConstructionOption[] = [
  {
    id: "baksteen-enkelsteens",
    name: "Baksteen",
    description: "Enkelsteens, standaard 100 mm.",
    textureClassName: "construction-option-texture-brick",
    layers: [{ materialId: "baksteen", thicknessMm: 100 }],
  },
  {
    id: "baksteen-dubbelsteens",
    name: "Baksteen",
    description: "Dubbelsteens, standaard 210 mm.",
    textureClassName: "construction-option-texture-double-brick",
    layers: [{ materialId: "baksteen", thicknessMm: 210 }],
  },
  {
    id: "kalkzandsteen",
    name: "Kalkzandsteen",
    description: "Massieve wand, standaard 100 mm.",
    textureClassName: "construction-option-texture-calcium-silicate",
    layers: [{ materialId: "kalkzandsteen", thicknessMm: 100 }],
  },
  {
    id: "gipsbeton",
    name: "Gipsbeton",
    description: "Massieve gipsblokken, standaard 80 mm.",
    textureClassName: "construction-option-texture-gypsum-block",
    layers: [{ materialId: "gipsbeton", thicknessMm: 80 }],
  },
  {
    id: "beton",
    name: "Beton",
    description: "Zware wand, standaard 200 mm.",
    textureClassName: "construction-option-texture-concrete",
    layers: [{ materialId: "beton-zwaar", thicknessMm: 200 }],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Lege opbouw om zelf samen te stellen.",
    textureClassName: "construction-option-texture-custom",
    layers: [],
  },
];

export const newWallActions: ConstructionOption[] = [
  {
    id: "copy-current",
    name: "Kopieer huidige muur",
    description: "Start met exact dezelfde opbouw.",
    textureClassName: "construction-option-texture-copy",
    layers: [],
  },
  {
    id: "lining-gipsplaat-ontkoppeld",
    name: "+ Gipsplaat",
    description: "Ontkoppeld met luchtspouw en isolatie.",
    textureClassName: "construction-option-texture-decoupled",
    layers: [
      { materialId: "luchtspouw", thicknessMm: 45 },
      { materialId: "steenwol-licht", thicknessMm: 40 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "lining-2x-gipsplaat-ontkoppeld",
    name: "+ 2x gipsplaat",
    description: "Ontkoppeld met luchtspouw, isolatie en dubbele beplating.",
    textureClassName: "construction-option-texture-decoupled-heavy",
    layers: [
      { materialId: "luchtspouw", thicknessMm: 70 },
      { materialId: "steenwol-middel", thicknessMm: 70 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "lining-gipsplaat-gekoppeld",
    name: "+ Gipsplaat direct",
    description: "Direct gekoppeld zonder spouw.",
    textureClassName: "construction-option-texture-direct",
    layers: [{ materialId: "gipsplaat", thicknessMm: 12.5 }],
  },
];
