import { WallVisualizer, wallVisualizerExampleProps } from "./WallVisualizer";

export function WallVisualizerExample() {
  return (
    <WallVisualizer
      {...wallVisualizerExampleProps}
      onModeChange={(mode) => {
        console.log("Wall visualizer mode:", mode);
      }}
    />
  );
}
