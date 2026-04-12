import type { FrequencyBandResult, PlaybackMode } from "../types";

interface PlaybackNodes {
  originalSource: AudioBufferSourceNode;
  simulatedSource: AudioBufferSourceNode;
  originalGain: GainNode;
  simulatedGain: GainNode;
  filters: BiquadFilterNode[];
}

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

  setBands(bands: FrequencyBandResult[]): void {
    this.bands = bands;
    this.nodes?.filters.forEach((filter, index) => {
      const band = bands[index];
      if (band) {
        filter.gain.setTargetAtTime(-band.attenuationDb, this.getContext().currentTime, 0.02);
      }
    });
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
    originalGain.gain.value = this.mode === "original" ? 1 : 0;
    simulatedGain.gain.value = this.mode === "simulated" ? 1 : 0;
    originalSource.connect(originalGain).connect(context.destination);

    const filters = this.bands.map((band, index) => {
      const filter = context.createBiquadFilter();
      filter.type = index === 0 ? "lowshelf" : index === this.bands.length - 1 ? "highshelf" : "peaking";
      filter.frequency.value = band.frequencyHz;
      filter.Q.value = 1.05;
      filter.gain.value = -band.attenuationDb;
      return filter;
    });

    let previousNode: AudioNode = simulatedSource;
    filters.forEach((filter) => {
      previousNode.connect(filter);
      previousNode = filter;
    });
    previousNode.connect(simulatedGain).connect(context.destination);

    return { originalSource, simulatedSource, originalGain, simulatedGain, filters };
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
