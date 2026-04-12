import type { FrequencyBandResult, PlaybackMode } from "../types";

interface PlaybackNodes {
  originalSource: AudioBufferSourceNode;
  simulatedSource: AudioBufferSourceNode;
  originalGain: GainNode;
  simulatedGain: GainNode;
  simulatedOutputGain: GainNode;
  filters: BiquadFilterNode[];
}

const MAX_EXTRA_FILTER_CUT_DB = 48;

export class AudioSimulationEngine {
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private nodes?: PlaybackNodes;
  private mode: PlaybackMode = "original";
  private bands: FrequencyBandResult[] = [];
  private startedAt = 0;
  private pausedAt = 0;
  private playing = false;

  async loadFile(file: File): Promise<number> {
    const context = this.getContext();
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    this.stop();
    return this.buffer.duration;
  }

  async loadUrl(url: string): Promise<number> {
    const context = this.getContext();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Audio sample kon niet worden geladen: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    this.buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    this.stop();
    return this.buffer.duration;
  }

  setBands(bands: FrequencyBandResult[]): void {
    this.bands = bands;
    const audioMapping = calculateTransmissionLossAudioMapping(bands);
    this.nodes?.filters.forEach((filter, index) => {
      const gainDb = audioMapping.filterGainsDb[index];
      if (gainDb !== undefined) {
        filter.gain.setTargetAtTime(gainDb, this.getContext().currentTime, 0.02);
      }
    });
    this.nodes?.simulatedOutputGain.gain.setTargetAtTime(audioMapping.outputGain, this.getContext().currentTime, 0.02);
  }

  setMode(mode: PlaybackMode): void {
    this.mode = mode;
    if (!this.nodes) {
      return;
    }
    const context = this.getContext();
    const now = context.currentTime;
    this.nodes.originalGain.gain.cancelScheduledValues(now);
    this.nodes.simulatedGain.gain.cancelScheduledValues(now);
    this.nodes.originalGain.gain.setTargetAtTime(mode === "original" ? 1 : 0, now, 0.015);
    this.nodes.simulatedGain.gain.setTargetAtTime(mode === "simulated" ? 1 : 0, now, 0.015);
  }

  async play(): Promise<void> {
    if (!this.buffer || this.playing) {
      return;
    }

    const context = this.getContext();
    if (context.state === "suspended") {
      await context.resume();
    }

    const offset = this.pausedAt % this.buffer.duration;
    this.nodes = this.createPlaybackGraph();
    this.startedAt = context.currentTime - offset;
    this.playing = true;
    this.nodes.originalSource.start(0, offset);
    this.nodes.simulatedSource.start(0, offset);
    this.nodes.originalSource.onended = () => {
      if (this.playing && this.getCurrentTime() >= (this.buffer?.duration ?? 0) - 0.05) {
        this.stop();
      }
    };
  }

  pause(): void {
    if (!this.playing) {
      return;
    }
    this.pausedAt = this.getCurrentTime();
    this.stopSources();
    this.playing = false;
  }

  stop(): void {
    this.stopSources();
    this.pausedAt = 0;
    this.playing = false;
  }

  getIsPlaying(): boolean {
    return this.playing;
  }

  getCurrentTime(): number {
    if (!this.playing || !this.context) {
      return this.pausedAt;
    }
    return this.context.currentTime - this.startedAt;
  }

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  private createPlaybackGraph(): PlaybackNodes {
    const context = this.getContext();
    if (!this.buffer) {
      throw new Error("No audio buffer loaded");
    }

    const originalSource = context.createBufferSource();
    const simulatedSource = context.createBufferSource();
    originalSource.buffer = this.buffer;
    simulatedSource.buffer = this.buffer;

    const originalGain = context.createGain();
    const simulatedGain = context.createGain();
    const simulatedOutputGain = context.createGain();
    const audioMapping = calculateTransmissionLossAudioMapping(this.bands);
    originalGain.gain.value = this.mode === "original" ? 1 : 0;
    simulatedGain.gain.value = this.mode === "simulated" ? 1 : 0;
    simulatedOutputGain.gain.value = audioMapping.outputGain;
    originalSource.connect(originalGain).connect(context.destination);

    const filters = this.bands.map((band, index) => {
      const filter = context.createBiquadFilter();
      filter.type = index === 0 ? "lowshelf" : index === this.bands.length - 1 ? "highshelf" : "peaking";
      filter.frequency.value = band.frequencyHz;
      filter.Q.value = 1;
      filter.gain.value = audioMapping.filterGainsDb[index] ?? 0;
      return filter;
    });

    let previousNode: AudioNode = simulatedSource;
    filters.forEach((filter) => {
      previousNode.connect(filter);
      previousNode = filter;
    });
    previousNode.connect(simulatedOutputGain).connect(simulatedGain).connect(context.destination);

    return { originalSource, simulatedSource, originalGain, simulatedGain, simulatedOutputGain, filters };
  }

  private stopSources(): void {
    if (!this.nodes) {
      return;
    }

    this.nodes.originalSource.onended = null;
    this.nodes.simulatedSource.onended = null;
    try {
      this.nodes.originalSource.stop();
      this.nodes.simulatedSource.stop();
    } catch {
      // Sources may already have ended.
    }
    this.nodes = undefined;
  }
}

function calculateTransmissionLossAudioMapping(bands: FrequencyBandResult[]): {
  filterGainsDb: number[];
  outputGain: number;
} {
  if (bands.length === 0) {
    return { filterGainsDb: [], outputGain: 1 };
  }

  const transmissionLossesDb = bands.map((band) => Math.max(0, band.attenuationDb));
  const baselineLossDb = Math.min(...transmissionLossesDb);

  // The global gain applies the absolute calculated loss that all bands share.
  // The EQ filters then add only the extra loss per band above that baseline,
  // avoiding double-counting while preserving the calculated curve shape.
  const filterGainsDb = transmissionLossesDb.map((lossDb) => {
    const extraLossDb = Math.max(0, lossDb - baselineLossDb);
    return -Math.min(MAX_EXTRA_FILTER_CUT_DB, extraLossDb);
  });

  return {
    filterGainsDb,
    outputGain: dbToGain(-baselineLossDb),
  };
}

function dbToGain(db: number): number {
  return 10 ** (db / 20);
}
