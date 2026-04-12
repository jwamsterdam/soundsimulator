import { audioSamples } from "../data/audioSamples";
import type { PlaybackMode } from "../types";

interface AudioPlayerPanelProps {
  fileName?: string;
  duration?: number;
  selectedSampleId: string;
  hasAudio: boolean;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  onSampleSelected: (sampleId: string) => void;
  onFileSelected: (file: File) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onModeChange: (mode: PlaybackMode) => void;
}

export function AudioPlayerPanel({
  fileName,
  duration,
  selectedSampleId,
  hasAudio,
  isPlaying,
  playbackMode,
  onSampleSelected,
  onFileSelected,
  onPlay,
  onPause,
  onStop,
  onModeChange,
}: AudioPlayerPanelProps) {
  return (
    <section className="panel audio-panel" aria-labelledby="audio-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A/B luisteren</p>
          <h2 id="audio-title">Audio</h2>
        </div>
      </div>

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

      <div className="segmented-control" aria-label="Playback mode">
        <button
          className={playbackMode === "original" ? "active" : ""}
          type="button"
          onClick={() => onModeChange("original")}
        >
          Original
        </button>
        <button
          className={playbackMode === "simulated" ? "active" : ""}
          type="button"
          onClick={() => onModeChange("simulated")}
        >
          Gesimuleerd
        </button>
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
    </section>
  );
}

function formatDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
