import { memo } from "react";
import type { FrequencyBandResult } from "../types";
import type { PlaybackMappingResult } from "../lib/playbackMapping";

interface AttenuationEqDisplayProps {
  currentBands: FrequencyBandResult[];
  newBands: FrequencyBandResult[];
  playbackMapping?: PlaybackMappingResult;
}

function formatFrequency(frequencyHz: number): string {
  if (frequencyHz >= 1000) {
    return `${frequencyHz / 1000} kHz`;
  }
  return `${frequencyHz} Hz`;
}

function AttenuationEqDisplayComponent({ currentBands, newBands, playbackMapping }: AttenuationEqDisplayProps) {
  const comparedBands = currentBands.map((currentBand, index) => {
    const newBand = newBands[index] ?? currentBand;
    const extraAttenuationDb = newBand.attenuationDb - currentBand.attenuationDb;

    return {
      frequencyHz: currentBand.frequencyHz,
      currentAttenuationDb: currentBand.attenuationDb,
      newAttenuationDb: newBand.attenuationDb,
      extraAttenuationDb,
    };
  });

  const maxDb = Math.max(60, ...comparedBands.map((band) => Math.max(band.currentAttenuationDb, band.newAttenuationDb)));

  return (
    <section className="panel eq-panel" aria-labelledby="eq-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gesimuleerde demping</p>
          <h2 id="eq-title">Visual EQ / transmissieverlies</h2>
        </div>
      </div>
      <div className="eq-legend" aria-label="Legenda transmissieverlies vergelijking">
        <span><i className="eq-legend-swatch eq-legend-current" aria-hidden="true" /> Huidige muur vooraan</span>
        <span><i className="eq-legend-swatch eq-legend-new" aria-hidden="true" /> Nieuwe muur erachter</span>
      </div>
      <div className="eq-chart-scroll">
        <div className="eq-chart" role="img" aria-label="Tienbanden display met wandverzwakking per frequentie">
          {comparedBands.map((band) => {
            const currentHeight = `${(Math.max(4, band.currentAttenuationDb) / maxDb) * 100}%`;
            const newHeight = `${(Math.max(4, band.newAttenuationDb) / maxDb) * 100}%`;
            const isImproved = band.extraAttenuationDb >= 0;

            return (
              <div className="eq-band" key={band.frequencyHz}>
                <div className="eq-value">
                  <strong>-{band.currentAttenuationDb.toFixed(1)} dB</strong>
                  <span className={isImproved ? "eq-delta-positive" : "eq-delta-negative"}>
                    {isImproved ? "+" : ""}
                    {band.extraAttenuationDb.toFixed(1)}
                  </span>
                </div>
                <div className="eq-track">
                  <div className="eq-fill eq-fill-new" style={{ height: newHeight }} />
                  <div className="eq-fill eq-fill-current" style={{ height: currentHeight }} />
                </div>
                <div className="eq-label">{formatFrequency(band.frequencyHz)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="explanation-box">
        <p>
          De warme balk vooraan toont de huidige muur. De groene balk erachter toont de nieuwe constructie over de
          volledige hoogte, zodat je per frequentie direct het verschil tussen beide ziet.
        </p>
        <p>
          De waarde onderaan geeft de winst of het verlies van de nieuwe muur ten opzichte van de huidige situatie.
          Het hoorbare signaal wordt in de browser gesimuleerd met een FIR/convolution transfer, afgeleid van de
          playback mapping.
        </p>
      </div>
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
