import type { Preset } from "../types";

export const presets: Preset[] = [
  {
    id: "enkele-gipsplaat",
    name: "Enkele gipsplaat",
    description: "Lichte referentie: weinig massa, veel doorgelaten geluid.",
    layers: [{ materialId: "gipsplaat", thicknessMm: 12.5 }],
  },
  {
    id: "dubbele-gipsplaat-direct",
    name: "Twee gipsplaten direct",
    description: "Zelfde materiaal direct gekoppeld: vooral extra massa.",
    layers: [
      { materialId: "gipsplaat", thicknessMm: 12.5 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "dubbele-gipswand-steenwol",
    name: "Dubbele gipswand met steenwol",
    description: "Cavity wall met demping: goed voor A/B met beton.",
    layers: [
      { materialId: "gipsplaat", thicknessMm: 12.5 },
      { materialId: "luchtspouw", thicknessMm: 70 },
      { materialId: "steenwol-middel", thicknessMm: 70 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "dubbele-gipswand-lege-spouw",
    name: "Dubbele gipswand lege spouw",
    description: "Laat horen wat spouwdemping toevoegt.",
    layers: [
      { materialId: "gipsplaat", thicknessMm: 12.5 },
      { materialId: "luchtspouw", thicknessMm: 70 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "betonwand-200",
    name: "Betonwand 200 mm",
    description: "Zware massieve referentie.",
    layers: [{ materialId: "beton-zwaar", thicknessMm: 200 }],
  },
  {
    id: "osb-gips",
    name: "OSB + gips",
    description: "Direct gekoppelde lichte plaatmassa.",
    layers: [
      { materialId: "osb", thicknessMm: 12 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "baksteen-spouw-kalkzandsteen",
    name: "Baksteen + luchtspouw + kalkzandsteen",
    description: "Zwaardere cavity wall met steenachtige bladen.",
    layers: [
      { materialId: "baksteen", thicknessMm: 100 },
      { materialId: "luchtspouw", thicknessMm: 50 },
      { materialId: "kalkzandsteen", thicknessMm: 100 },
    ],
  },
];
