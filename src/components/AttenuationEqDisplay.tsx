import { memo } from "react";
import type { FrequencyBandResult } from "../types";
import type { PlaybackMappingResult } from "../lib/playbackMapping";

interface AttenuationEqDisplayProps {
  bands: FrequencyBandResult[];
  playbackMapping?: PlaybackMappingResult;
}

function formatFrequency(frequencyHz: number): string {
  if (frequencyHz >= 1000) {
    return `${frequencyHz / 1000} kHz`;
  }
  return `${frequencyHz} Hz`;
}

function AttenuationEqDisplayComponent({ bands, playbackMapping }: AttenuationEqDisplayProps) {
  const maxDb = Math.max(60, ...bands.map((band) => band.attenuationDb));

  return (
    <section className="panel eq-panel" aria-labelledby="eq-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gegenereerde demping</p>
          <h2 id="eq-title">Visual EQ / transmissieverlies</h2>
        </div>
      </div>
      <div className="eq-chart" role="img" aria-label="Tienbanden display met wandverzwakking per frequentie">
        {bands.map((band) => {
          const height = `${Math.max(4, (band.attenuationDb / maxDb) * 100)}%`;
          return (
            <div className="eq-band" key={band.frequencyHz}>
              <div className="eq-value">-{band.attenuationDb.toFixed(1)} dB</div>
              <div className="eq-track">
                <div className="eq-fill" style={{ height }} />
              </div>
              <div className="eq-label">{formatFrequency(band.frequencyHz)}</div>
            </div>
          );
        })}
      </div>
      <p className="hint">De balken tonen berekende verzwakking door de constructie. Dit is geen handmatige EQ.</p>
      {playbackMapping ? (
        <div className="playback-summary">
          <strong>Playback mapping</strong>
          <span>Raw breedband: {playbackMapping.rawBroadbandLossDb.toFixed(1)} dB</span>
          <span>Playback breedband: -{playbackMapping.playbackBroadbandLossDb.toFixed(1)} dB</span>
          <span>Uitgangsgain: {playbackMapping.outputGainLinear.toFixed(3)}</span>
        </div>
      ) : null}
    </section>
  );
}

export const AttenuationEqDisplay = memo(AttenuationEqDisplayComponent);
