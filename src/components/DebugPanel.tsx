import type { PlaybackMappingResult } from "../lib/playbackMapping";
import type { SimulationResult } from "../types";

interface DebugPanelProps {
  result: SimulationResult;
  playbackMapping: PlaybackMappingResult;
}

export function DebugPanel({ result, playbackMapping }: DebugPanelProps) {
  return (
    <details className="panel debug-panel">
      <summary>Debug / inspectie playback mapping</summary>
      <div className="debug-grid">
        <div>
          <span>Systeemtype</span>
          <strong>{result.systemType}</strong>
        </div>
        <div>
          <span>Oppervlaktemassa</span>
          <strong>{result.totalSurfaceMassKgM2.toFixed(1)} kg/m2</strong>
        </div>
        <div>
          <span>Spouw</span>
          <strong>{result.cavityThicknessMm ? `${result.cavityThicknessMm} mm` : "n.v.t."}</strong>
        </div>
        <div>
          <span>Resonantie</span>
          <strong>{result.estimatedResonanceHz ? `${Math.round(result.estimatedResonanceHz)} Hz` : "n.v.t."}</strong>
        </div>
        <div>
          <span>Porous fill</span>
          <strong>{result.hasPorousFill ? "ja" : "nee"}</strong>
        </div>
        <div>
          <span>Raw weighted TL</span>
          <strong>{playbackMapping.rawBroadbandLossDb.toFixed(1)} dB</strong>
        </div>
        <div>
          <span>Playback broadband</span>
          <strong>{playbackMapping.playbackBroadbandLossDb.toFixed(1)} dB</strong>
        </div>
        <div>
          <span>Output gain</span>
          <strong>
            {playbackMapping.outputGainLinear.toFixed(4)} ({playbackMapping.outputGainDb.toFixed(1)} dB)
          </strong>
        </div>
      </div>

      <div className="debug-table-wrap">
        <table className="debug-table">
          <thead>
            <tr>
              <th>Hz</th>
              <th>TL display</th>
              <th>Relatief</th>
              <th>Gesmoothd</th>
              <th>Filter gain</th>
            </tr>
          </thead>
          <tbody>
            {playbackMapping.bands.map((band) => (
              <tr key={band.frequencyHz}>
                <td>{band.frequencyHz}</td>
                <td>{band.calculatedTlDb.toFixed(1)} dB</td>
                <td>{band.relativeShapeDb.toFixed(1)} dB</td>
                <td>{band.smoothedShapeDb.toFixed(1)} dB</td>
                <td>{band.playbackFilterGainDb.toFixed(1)} dB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
