import type { FirDesignResult } from "../lib/fir";
import type { PlaybackMappingResult } from "../lib/playbackMapping";
import type { SimulationResult } from "../types";

interface DebugPanelProps {
  result: SimulationResult;
  playbackMapping: PlaybackMappingResult;
  firDesign: FirDesignResult;
}

export function DebugPanel({ result, playbackMapping, firDesign }: DebugPanelProps) {
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
          <strong>
            {result.cavityThicknessesMm?.length
              ? result.cavityThicknessesMm.map((thicknessMm) => `${thicknessMm} mm`).join(" / ")
              : "n.v.t."}
          </strong>
        </div>
        <div>
          <span>Resonantie</span>
          <strong>
            {result.resonanceFrequenciesHz?.length
              ? result.resonanceFrequenciesHz.map((frequencyHz) => `${Math.round(frequencyHz)} Hz`).join(" / ")
              : "n.v.t."}
          </strong>
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
        <div>
          <span>FIR sample rate</span>
          <strong>{firDesign.sampleRate} Hz</strong>
        </div>
        <div>
          <span>Impulse length</span>
          <strong>{firDesign.impulseLength} samples</strong>
        </div>
        <div>
          <span>Convolution mode</span>
          <strong>{firDesign.mode}</strong>
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
              <th>Target playback</th>
              <th>FIR achieved</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {playbackMapping.bands.map((band, index) => (
              <tr key={band.frequencyHz}>
                <td>{band.frequencyHz}</td>
                <td>{band.calculatedTlDb.toFixed(1)} dB</td>
                <td>{band.relativeShapeDb.toFixed(1)} dB</td>
                <td>{band.smoothedShapeDb.toFixed(1)} dB</td>
                <td>{band.playbackAttenuationDb.toFixed(1)} dB</td>
                <td>{firDesign.bandChecks[index]?.achievedAttenuationDb.toFixed(1)} dB</td>
                <td>{firDesign.bandChecks[index]?.errorDb.toFixed(1)} dB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
