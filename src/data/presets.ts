import type { Preset } from "../types";

export const presets: Preset[] = [
  {
    id: "enkele-gipsplaat",
    name: "Enkele gipsplaat",
    layers: [{ materialId: "gipsplaat", thicknessMm: 12.5 }],
  },
  {
    id: "dubbele-gipswand-steenwol",
    name: "Dubbele gipswand met steenwol",
    layers: [
      { materialId: "gipsplaat", thicknessMm: 12.5 },
      { materialId: "luchtspouw", thicknessMm: 70 },
      { materialId: "steenwol-middel", thicknessMm: 70 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "betonwand-200",
    name: "Betonwand 200 mm",
    layers: [{ materialId: "beton-zwaar", thicknessMm: 200 }],
  },
  {
    id: "osb-gips",
    name: "OSB + gips",
    layers: [
      { materialId: "osb", thicknessMm: 12 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "baksteen-spouw-kalkzandsteen",
    name: "Baksteen + luchtspouw + kalkzandsteen",
    layers: [
      { materialId: "baksteen", thicknessMm: 100 },
      { materialId: "luchtspouw", thicknessMm: 50 },
      { materialId: "kalkzandsteen", thicknessMm: 100 },
    ],
  },
];
