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
  modeOptions: { mode: PlaybackMode; label: string }[];
  onSampleSelected: (sampleId: string) => void;
  onFileSelected: (file: File) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onModeChange: (mode: PlaybackMode) => void;
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
    description: "Huidige muur staat op luistervolume; nieuwe muur blijft zachter of harder ten opzichte daarvan.",
  },
  {
    mode: "realistic",
    label: "Werkelijk volume",
    description: "Huidige en nieuwe muur spelen met hun berekende volume ten opzichte van het origineel.",
  },
];

export function AudioPlayerPanel({
  fileName,
  duration,
  selectedSampleId,
  hasAudio,
  isPlaying,
  playbackMode,
  playbackVolumeMode,
  performanceSettings,
  modeOptions,
  onSampleSelected,
  onFileSelected,
  onPlay,
  onPause,
  onStop,
  onModeChange,
  onVolumeModeChange,
  onPerformanceSettingsChange,
  onOriginalReference,
}: AudioPlayerPanelProps) {
  return (
    <section className="panel audio-panel" aria-labelledby="audio-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Audio bron</p>
          <h2 id="audio-title">Audio</h2>
        </div>
      </div>

      <div className="sample-reference-row">
        <label className="field sample-field">
          <span>Demo-track</span>
          <select value={selectedSampleId} onChange={(event) => onSampleSelected(event.target.value)}>
            {audioSamples.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.title} - {sample.artist} (muziek)
              </option>
            ))}
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
      <p className="hint audio-guidance">
        Ingebouwde tracks zijn muziekgericht. Gebruik "Eigen MP3 uploaden" voor een spraakgerichte test.
      </p>

      <div className="volume-mode-panel" aria-labelledby="volume-mode-title">
        <div>
          <p className="eyebrow">Luistervolume</p>
          <h3 id="volume-mode-title">Kies hoe hard de muurversies afspelen</h3>
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

      <div className="listen-panel" aria-labelledby="listen-title">
        <div>
          <p className="eyebrow">Luisteren</p>
          <h3 id="listen-title">Vergelijk het resultaat</h3>
        </div>
        <div className={`segmented-control mode-count-${modeOptions.length}`} aria-label="Playback mode">
          {modeOptions.map((option) => (
            <button
              className={playbackMode === option.mode ? "active" : ""}
              key={option.mode}
              type="button"
              onClick={() => onModeChange(option.mode)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="hint audition-note">
          {playbackVolumeMode === "comparison"
            ? "Praktisch vergelijken: huidige muur is de luisterreferentie; nieuwe muur behoudt het verschil ten opzichte daarvan."
            : "Werkelijk volume: beide muurversies volgen de berekende demping ten opzichte van het originele geluid."}
        </p>

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

      <div className="performance-test-panel" aria-labelledby="performance-test-title">
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
              <option value="1024">1024 huidig: 1025 taps</option>
              <option value="512">512 test: 513 taps</option>
              <option value="256">256 test: 257 taps</option>
              <option value="128">128 test: 129 taps</option>
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
      </div>
    </section>
  );
}

function formatDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
