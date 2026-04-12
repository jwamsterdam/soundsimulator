import type { PlaybackEqBand, PlaybackMappingResult } from "./playbackMapping";
import type { PlaybackMode, SimulationResult } from "../types";

interface PlaybackNodes {
  originalSource: AudioBufferSourceNode;
  simulatedSource: AudioBufferSourceNode;
  originalGain: GainNode;
  simulatedGain: GainNode;
  simulatedOutputGain: GainNode;
  filters: BiquadFilterNode[];
}

export interface AssignedFilterDebug {
  frequencyHz: number;
  type: BiquadFilterType;
  q?: number;
  gainDb: number;
}

export class AudioSimulationEngine {
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private nodes?: PlaybackNodes;
  private mode: PlaybackMode = "original";
  private mapping?: PlaybackMappingResult;
  private simulationResult?: SimulationResult;
  private assignedFilters: AssignedFilterDebug[] = [];
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

  setPlaybackMapping(mapping: PlaybackMappingResult, simulationResult?: SimulationResult): void {
    this.mapping = mapping;
    this.simulationResult = simulationResult;
    this.nodes?.filters.forEach((filter, index) => {
      const band = mapping.bands[index];
      if (band) {
        filter.gain.setTargetAtTime(band.playbackFilterGainDb, this.getContext().currentTime, 0.02);
      }
    });
    this.nodes?.simulatedOutputGain.gain.setTargetAtTime(mapping.outputGainLinear, this.getContext().currentTime, 0.02);
    this.logDebugMapping();
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
    const mapping = this.mapping;
    originalGain.gain.value = this.mode === "original" ? 1 : 0;
    simulatedGain.gain.value = this.mode === "simulated" ? 1 : 0;
    simulatedOutputGain.gain.value = mapping?.outputGainLinear ?? 1;
    originalSource.connect(originalGain).connect(context.destination);

    const filters = (mapping?.bands ?? []).map((band, index) => {
      const filter = context.createBiquadFilter();
      const params = getFilterParams(band, index, mapping?.bands.length ?? 0);
      filter.type = params.type;
      filter.frequency.value = params.frequencyHz;
      if (params.q) {
        filter.Q.value = params.q;
      }
      filter.gain.value = band.playbackFilterGainDb;
      return filter;
    });
    this.assignedFilters = (mapping?.bands ?? []).map((band, index) => {
      const params = getFilterParams(band, index, mapping?.bands.length ?? 0);
      return {
        frequencyHz: params.frequencyHz,
        type: params.type,
        q: params.q,
        gainDb: band.playbackFilterGainDb,
      };
    });
    this.logDebugMapping();

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

  private logDebugMapping(): void {
    if (!import.meta.env.DEV || !this.mapping) {
      return;
    }

    console.table({
      systemType: this.simulationResult?.systemType,
      totalSurfaceMassKgM2: this.simulationResult?.totalSurfaceMassKgM2,
      resonanceHz: this.simulationResult?.estimatedResonanceHz,
      broadbandLossDb: this.mapping.broadbandLossDb,
      outputGainLinear: this.mapping.outputGainLinear,
      outputGainDb: this.mapping.outputGainDb,
    });
    console.table(
      this.mapping.bands.map((band, index) => ({
        hz: band.frequencyHz,
        displayTlDb: band.calculatedTlDb,
        relativeShapeDb: band.relativeShapeDb,
        smoothedShapeDb: band.smoothedShapeDb,
        playbackFilterGainDb: band.playbackFilterGainDb,
        assignedType: this.assignedFilters[index]?.type,
        assignedFrequencyHz: this.assignedFilters[index]?.frequencyHz,
        assignedQ: this.assignedFilters[index]?.q,
      })),
    );
  }
}

function getFilterParams(
  band: PlaybackEqBand,
  index: number,
  bandCount: number,
): { type: BiquadFilterType; frequencyHz: number; q?: number } {
  if (index === 0) {
    return { type: "lowshelf", frequencyHz: 80 };
  }

  if (index === bandCount - 1) {
    return { type: "highshelf", frequencyHz: 10000 };
  }

  return {
    type: "peaking",
    frequencyHz: band.frequencyHz,
    q: 1.35,
  };
}
