import type { WallVisualizerData } from "./types";

export const demoWallVisualizerData: WallVisualizerData = {
  existingWall: {
    title: "Oude muur",
    layers: [
      {
        id: "existing-brick",
        name: "Bestaande muur",
        material: "Steen / metselwerk",
        thicknessMm: 240,
        color: "#9b5a43",
        texture: "brick",
      },
    ],
  },
  newWall: {
    title: "Nieuwe muur",
    layers: [
      {
        id: "air-gap",
        name: "Luchtspouw",
        material: "Lucht",
        thicknessMm: 20,
        color: "#d8eef7",
        texture: "air",
      },
      {
        id: "studs",
        name: "Regelwerk",
        material: "Hout",
        thicknessMm: 45,
        color: "#c99a5b",
        texture: "wood",
      },
      {
        id: "insulation",
        name: "Isolatie",
        material: "Minerale wol",
        thicknessMm: 120,
        color: "#d7bd63",
        texture: "insulation",
      },
      {
        id: "membrane",
        name: "Dampremmende laag",
        material: "Folie",
        thicknessMm: 1,
        color: "#333333",
        texture: "membrane",
      },
      {
        id: "gypsum",
        name: "Gipsplaat",
        material: "Gips",
        thicknessMm: 12.5,
        color: "#eee9df",
        texture: "gypsum",
      },
    ],
  },
};
