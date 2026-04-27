import { audioSamples } from "../data/audioSamples";
import type { AudioPerformanceSettings, PlaybackMode, PlaybackVolumeMode } from "../types";

interface AudioPlayerPanelProps {
  fileName?: string;
  duration?: number;
  selectedSampleId: string;
  hasAudio: boolean;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  playbackVolumeMode: PlaybackVolumeMode;
  performanceSettings: AudioPerformanceSettings;
  performanceDebugInfo: {
    requestedImpulseLength: number;
    effectiveImpulseLength: number;
    sampleRate: number;
    maxFirErrorDb: number;
    cacheHit: boolean;
  };
  onSampleSelected: (sampleId: string) => void;
  onFileSelected: (file: File) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onVolumeModeChange: (mode: PlaybackVolumeMode) => void;
  onPerformanceSettingsChange: (settings: AudioPerformanceSettings) => void;
  onOriginalReference: () => void;
}

const volumeModeOptions: {
  mode: PlaybackVolumeMode;
  label: string;
  description: string;
}[] = [
  {
    mode: "comparison",
    label: "Vergelijkbaar volume",
    description:
      "Normaliseert de bestaande muur als luisterreferentie. Handig voor klankkleur, minder voor absolute demping.",
  },
  {
    mode: "realistic",
    label: "Werkelijk volume",
    description:
      "Bestaande muur en voorzetwand spelen met hun berekende demping. Beste stand om diktes en materialen te testen.",
  },
];

const soundSamples = audioSamples.filter((sample) => sample.focus === "sound");
const musicSamples = audioSamples.filter((sample) => sample.focus === "music");

export function AudioPlayerPanel({
  fileName,
  duration,
  selectedSampleId,
  hasAudio,
  isPlaying,
  playbackMode,
  playbackVolumeMode,
  performanceSettings,
  performanceDebugInfo,
  onSampleSelected,
  onFileSelected,
  onPlay,
  onPause,
  onStop,
  onVolumeModeChange,
  onPerformanceSettingsChange,
  onOriginalReference,
}: AudioPlayerPanelProps) {
  return (
    <section className="panel audio-panel" aria-labelledby="audio-title">
      <div className="section-heading audio-heading">
        <div>
          <p className="eyebrow">Audio bron</p>
          <h2 id="audio-title">Luistertest</h2>
        </div>
        <p className="audio-heading-copy">
          Kies burengeluid en gebruik de knoppen boven de wandkolommen om de bestaande muur of de voorzetwand te horen.
        </p>
      </div>

      <div className="audio-workbench">
        <div className="audio-source-card">
          <div className="sample-reference-row">
            <label className="field sample-field">
              <span>Geluid</span>
              <select value={selectedSampleId} onChange={(event) => onSampleSelected(event.target.value)}>
                <optgroup label="Geluiden">
                  {soundSamples.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Muziek">
                  {musicSamples.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.title}
                    </option>
                  ))}
                </optgroup>
                <option value="upload">Eigen MP3 uploaden</option>
              </select>
            </label>
            <button
              className={`original-reference-button${playbackMode === "original" ? " active" : ""}`}
              type="button"
              onClick={onOriginalReference}
              disabled={!hasAudio}
              aria-label="Luister naar het originele geluid"
              title="Origineel geluid"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 9v6h4l5 4V5L8 9H4z" />
                <path d="M16 8.5a4 4 0 0 1 0 7" />
                <path d="M18.5 6a7 7 0 0 1 0 12" />
              </svg>
              <span>Origineel</span>
            </button>
          </div>

          {selectedSampleId === "upload" ? (
            <label className="upload-zone">
              <span>Eigen MP3</span>
              <small>Voor spraaktests werkt een droge stemopname zonder muziek of galm het best.</small>
              <input
                accept="audio/mpeg,audio/mp3,audio/*"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onFileSelected(file);
                  }
                }}
              />
            </label>
          ) : null}

          <div className="audio-file-meta">
            {fileName ? (
              <>
                <strong>{fileName}</strong>
                {duration ? <span>{formatDuration(duration)}</span> : null}
              </>
            ) : (
              <span>Kies een demo-track of selecteer "Eigen MP3 uploaden".</span>
            )}
          </div>

          <div className="transport-controls">
            <button type="button" onClick={onPlay} disabled={!hasAudio || isPlaying}>
              Play
            </button>
            <button type="button" onClick={onPause} disabled={!hasAudio || !isPlaying}>
              Pause
            </button>
            <button type="button" onClick={onStop} disabled={!hasAudio}>
              Stop/reset
            </button>
          </div>
        </div>

        <div className="audio-volume-card" aria-labelledby="volume-mode-title">
          <div>
            <p className="eyebrow">Volume</p>
            <h3 id="volume-mode-title">Referentie</h3>
          </div>
          <div className="volume-mode-grid">
            {volumeModeOptions.map((option) => (
              <button
                className={playbackVolumeMode === option.mode ? "active" : ""}
                key={option.mode}
                type="button"
                onClick={() => onVolumeModeChange(option.mode)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="hint audition-note">
          {playbackVolumeMode === "comparison"
            ? "Bestaande muur is de luisterreferentie; de muur met voorzetwand behoudt het verschil ten opzichte daarvan."
            : "Beide muurversies volgen de berekende demping ten opzichte van het originele geluid."}
        </p>
      </div>

      <details className="performance-test-panel" aria-labelledby="performance-test-title">
        <summary>
          <span>Audio-engine instellingen</span>
          <strong>{performanceDebugInfo.effectiveImpulseLength} taps</strong>
        </summary>
        <div>
          <p className="eyebrow">Performance test</p>
          <h3 id="performance-test-title">IR en AudioContext</h3>
        </div>
        <div className="performance-test-grid">
          <label className="field">
            <span>IR lengte</span>
            <select
              value={performanceSettings.firImpulsePreset}
              onChange={(event) =>
                onPerformanceSettingsChange({
                  ...performanceSettings,
                  firImpulsePreset: event.target.value as AudioPerformanceSettings["firImpulsePreset"],
                })
              }
            >
              <option value="1024">1024 kwaliteit: 1025 taps</option>
              <option value="512">512 test: 513 taps</option>
              <option value="256">256 test: 257 taps</option>
              <option value="128">128 default: 129 taps</option>
              <option value="64">64 test: 65 taps</option>
              <option value="32">32 test: 33 taps</option>
              <option value="16">16 test: 17 taps</option>
            </select>
          </label>
          <label className="field">
            <span>AudioContext</span>
            <select
              value={performanceSettings.audioContextProfile}
              onChange={(event) =>
                onPerformanceSettingsChange({
                  ...performanceSettings,
                  audioContextProfile: event.target.value as AudioPerformanceSettings["audioContextProfile"],
                })
              }
            >
              <option value="default">Browser default</option>
              <option value="interactive-48k">Interactive + 48 kHz</option>
            </select>
          </label>
        </div>
        <p className="hint audition-note">
          Deze opties veranderen alleen de playback-engine. De gekozen lengte wordt intern afgerond naar een oneven
          FIR-lengte.
        </p>
        <dl className="performance-metrics" aria-label="Actieve FIR testwaarden">
          <div>
            <dt>Gekozen</dt>
            <dd>{performanceDebugInfo.requestedImpulseLength} taps</dd>
          </div>
          <div>
            <dt>Actief FIR</dt>
            <dd>{performanceDebugInfo.effectiveImpulseLength} taps</dd>
          </div>
          <div>
            <dt>Preview rate</dt>
            <dd>{performanceDebugInfo.sampleRate / 1000} kHz</dd>
          </div>
          <div>
            <dt>Max fout</dt>
            <dd>{performanceDebugInfo.maxFirErrorDb.toFixed(1)} dB</dd>
          </div>
          <div>
            <dt>Cache hit</dt>
            <dd>{performanceDebugInfo.cacheHit ? "ja" : "nee"}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

function formatDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
