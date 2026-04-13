import type { Preset } from "../types";

export const liningSystems: Preset[] = [
  {
    id: "vrijstaand-ms-steenwol-dubbel-gips",
    name: "Vrijstaande metal-stud + steenwol + 2x gips",
    description: "Ontkoppelde voorzetwand met gevulde spouw en dubbele beplating.",
    layers: [
      { materialId: "luchtspouw", thicknessMm: 70 },
      { materialId: "steenwol-middel", thicknessMm: 70 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "dunne-voorzetwand-steenwol-gips",
    name: "Dunne voorzetwand + steenwol + gips",
    description: "Compacte verbetering met beperkte spouwdiepte.",
    layers: [
      { materialId: "luchtspouw", thicknessMm: 45 },
      { materialId: "steenwol-licht", thicknessMm: 40 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
  {
    id: "zware-akoestische-voorzetwand",
    name: "Zware akoestische voorzetwand",
    description: "Gevulde spouw met OSB en dubbele gipsplaat voor extra massa.",
    layers: [
      { materialId: "luchtspouw", thicknessMm: 90 },
      { materialId: "steenwol-zwaar", thicknessMm: 80 },
      { materialId: "osb", thicknessMm: 12 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
      { materialId: "gipsplaat", thicknessMm: 12.5 },
    ],
  },
];
