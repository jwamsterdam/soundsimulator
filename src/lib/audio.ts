import { designFirFilter, type FirDesignResult } from "./fir";
import type { PlaybackMappingResult } from "./playbackMapping";
import type { AudioContextProfile, AudioPerformanceSettings, FirImpulsePreset, PlaybackMode, SimulationResult } from "../types";

interface PlaybackNodes {
  originalSource: AudioBufferSourceNode;
  existingSource: AudioBufferSourceNode;
  improvedSource?: AudioBufferSourceNode;
  originalGain: GainNode;
  existingGain: GainNode;
  improvedGain?: GainNode;
  existingConvolver: ConvolverNode;
  improvedConvolver?: ConvolverNode;
}

export class AudioSimulationEngine {
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private decodedUrlCache = new Map<string, AudioBuffer>();
  private impulseBufferCache = new Map<string, AudioBuffer>();
  private nodes?: PlaybackNodes;
  private mode: PlaybackMode = "original";
  private existingMapping?: PlaybackMappingResult;
  private improvedMapping?: PlaybackMappingResult;
  private simulationResult?: SimulationResult;
  private existingFirDesign?: FirDesignResult;
  private improvedFirDesign?: FirDesignResult;
  private impulseLength = getImpulseLengthFromPreset("128");
  private audioContextProfile: AudioContextProfile = "default";
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
    const cachedBuffer = this.decodedUrlCache.get(url);
    if (cachedBuffer) {
      this.buffer = cachedBuffer;
      this.stop();
      return cachedBuffer.duration;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Audio sample kon niet worden geladen: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    this.buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    this.decodedUrlCache.set(url, this.buffer);
    this.stop();
    return this.buffer.duration;
  }

  setPlaybackMapping(mapping: PlaybackMappingResult, simulationResult?: SimulationResult): void {
    this.setPlaybackMappings(mapping, undefined, simulationResult);
  }

  setPerformanceSettings(settings: AudioPerformanceSettings): void {
    const nextImpulseLength = getImpulseLengthFromPreset(settings.firImpulsePreset);
    const impulseChanged = nextImpulseLength !== this.impulseLength;
    const contextProfileChanged = settings.audioContextProfile !== this.audioContextProfile;

    this.impulseLength = nextImpulseLength;
    this.audioContextProfile = settings.audioContextProfile;

    if (contextProfileChanged) {
      const wasPlaying = this.playing;
      const currentTime = this.getCurrentTime();
      this.stopSources();
      this.pausedAt = this.buffer ? currentTime % this.buffer.duration : 0;
      this.playing = false;
      void this.closeContext().then(() => {
        this.existingFirDesign = undefined;
        this.improvedFirDesign = undefined;
        if (wasPlaying) {
          void this.play();
        }
      });
      return;
    }

    if (impulseChanged) {
      this.existingFirDesign = undefined;
      this.improvedFirDesign = undefined;
      this.impulseBufferCache.clear();
      this.refreshFirDesigns();
      if (this.nodes) {
        this.rebuildGraphAtCurrentTime();
      }
    }
  }

  setPlaybackMappings(
    existingMapping: PlaybackMappingResult,
    improvedMapping?: PlaybackMappingResult,
    simulationResult?: SimulationResult,
  ): void {
    const hadImprovedPath = Boolean(this.nodes?.improvedSource);
    const previousExistingFirKey = this.existingFirDesign?.cacheKey;
    const previousImprovedFirKey = this.improvedFirDesign?.cacheKey;
    this.existingMapping = existingMapping;
    this.improvedMapping = improvedMapping;
    this.simulationResult = simulationResult;
    if (!this.context) {
      return;
    }

    this.refreshFirDesigns();
    if (this.nodes) {
      const firChanged =
        previousExistingFirKey !== this.existingFirDesign?.cacheKey ||
        previousImprovedFirKey !== this.improvedFirDesign?.cacheKey;
      if (firChanged || hadImprovedPath !== Boolean(improvedMapping)) {
        this.rebuildGraphAtCurrentTime();
      }
    }
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
    this.nodes.existingGain.gain.cancelScheduledValues(now);
    this.nodes.improvedGain?.gain.cancelScheduledValues(now);
    this.nodes.originalGain.gain.setTargetAtTime(mode === "original" ? 1 : 0, now, 0.015);
    this.nodes.existingGain.gain.setTargetAtTime(mode === "existing" ? 1 : 0, now, 0.015);
    this.nodes.improvedGain?.gain.setTargetAtTime(mode === "improved" ? 1 : 0, now, 0.015);
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
    this.nodes.existingSource.start(0, offset);
    this.nodes.improvedSource?.start(0, offset);
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
    if (!this.context || this.context.state === "closed") {
      this.context = createAudioContext(this.audioContextProfile);
    }
    return this.context;
  }

  private refreshFirDesigns(): void {
    if (!this.context || !this.existingMapping) {
      return;
    }

    const context = this.context;
    this.existingFirDesign = designFirFilter(this.existingMapping, context.sampleRate, this.impulseLength);
    this.improvedFirDesign = this.improvedMapping
      ? designFirFilter(this.improvedMapping, context.sampleRate, this.impulseLength)
      : undefined;
  }

  private createPlaybackGraph(): PlaybackNodes {
    const context = this.getContext();
    if (!this.buffer) {
      throw new Error("No audio buffer loaded");
    }

    const originalSource = context.createBufferSource();
    const existingSource = context.createBufferSource();
    originalSource.buffer = this.buffer;
    existingSource.buffer = this.buffer;

    const originalGain = context.createGain();
    const existingGain = context.createGain();
    const existingMapping = this.existingMapping;
    const existingFirDesign = existingMapping
      ? (this.existingFirDesign ?? designFirFilter(existingMapping, context.sampleRate, this.impulseLength))
      : undefined;
    this.existingFirDesign = existingFirDesign;
    originalGain.gain.value = this.mode === "original" ? 1 : 0;
    existingGain.gain.value = this.mode === "existing" ? 1 : 0;
    originalSource.connect(originalGain).connect(context.destination);

    const existingConvolver = context.createConvolver();
    existingConvolver.normalize = false;
    if (existingFirDesign) {
      existingConvolver.buffer = this.getImpulseBuffer(context, existingFirDesign);
    }
    existingSource.connect(existingConvolver).connect(existingGain).connect(context.destination);

    let improvedSource: AudioBufferSourceNode | undefined;
    let improvedGain: GainNode | undefined;
    let improvedConvolver: ConvolverNode | undefined;
    if (this.improvedMapping) {
      improvedSource = context.createBufferSource();
      improvedSource.buffer = this.buffer;
      improvedGain = context.createGain();
      improvedGain.gain.value = this.mode === "improved" ? 1 : 0;
      const improvedFirDesign =
        this.improvedFirDesign ?? designFirFilter(this.improvedMapping, context.sampleRate, this.impulseLength);
      this.improvedFirDesign = improvedFirDesign;
      improvedConvolver = context.createConvolver();
      improvedConvolver.normalize = false;
      improvedConvolver.buffer = this.getImpulseBuffer(context, improvedFirDesign);
      improvedSource.connect(improvedConvolver).connect(improvedGain).connect(context.destination);
    }

    this.logDebugMapping();

    return {
      originalSource,
      existingSource,
      improvedSource,
      originalGain,
      existingGain,
      improvedGain,
      existingConvolver,
      improvedConvolver,
    };
  }

  private stopSources(): void {
    if (!this.nodes) {
      return;
    }

    const nodes = this.nodes;
    this.nodes.originalSource.onended = null;
    nodes.existingSource.onended = null;
    if (nodes.improvedSource) {
      nodes.improvedSource.onended = null;
    }
    try {
      nodes.originalSource.stop();
      nodes.existingSource.stop();
      nodes.improvedSource?.stop();
    } catch {
      // Sources may already have ended.
    }
    disconnectPlaybackNodes(nodes);
    this.nodes = undefined;
  }

  async stopAndRelease(): Promise<void> {
    this.stop();
    await this.closeContext();
  }

  async dispose(): Promise<void> {
    this.stop();
    this.buffer = undefined;
    this.decodedUrlCache.clear();
    this.existingMapping = undefined;
    this.improvedMapping = undefined;
    this.simulationResult = undefined;
    this.existingFirDesign = undefined;
    this.improvedFirDesign = undefined;
    await this.closeContext();
  }

  private async closeContext(): Promise<void> {
    this.impulseBufferCache.clear();
    const context = this.context;
    this.context = undefined;
    if (!context || context.state === "closed") {
      return;
    }
    await context.close();
  }

  private rebuildGraphAtCurrentTime(): void {
    if (!this.buffer) {
      return;
    }

    const wasPlaying = this.playing;
    const currentTime = this.getCurrentTime();
    this.stopSources();
    this.pausedAt = currentTime % this.buffer.duration;
    this.playing = false;
    if (wasPlaying) {
      void this.play();
    }
  }

  private logDebugMapping(): void {
    if (!import.meta.env.DEV || !this.existingMapping) {
      return;
    }

    console.table({
      systemType: this.simulationResult?.systemType,
      totalSurfaceMassKgM2: this.simulationResult?.totalSurfaceMassKgM2,
      resonanceHz: this.simulationResult?.estimatedResonanceHz,
      rawBroadbandLossDb: this.existingMapping.rawBroadbandLossDb,
      playbackBroadbandLossDb: this.existingMapping.playbackBroadbandLossDb,
      outputGainLinear: this.existingMapping.outputGainLinear,
      outputGainDb: this.existingMapping.outputGainDb,
      firSampleRate: this.existingFirDesign?.sampleRate,
      firImpulseLength: this.existingFirDesign?.impulseLength,
      requestedImpulseLength: this.impulseLength,
      audioContextProfile: this.audioContextProfile,
      firMode: this.existingFirDesign?.mode,
      hasImprovedPath: Boolean(this.improvedMapping),
    });
    console.table(
      this.existingMapping.bands.map((band, index) => ({
        hz: band.frequencyHz,
        displayTlDb: band.calculatedTlDb,
        relativeShapeDb: band.relativeShapeDb,
        smoothedShapeDb: band.smoothedShapeDb,
        playbackAttenuationDb: band.playbackAttenuationDb,
        achievedFirAttenuationDb: this.existingFirDesign?.bandChecks[index]?.achievedAttenuationDb,
        firErrorDb: this.existingFirDesign?.bandChecks[index]?.errorDb,
      })),
    );
  }

  private getImpulseBuffer(context: AudioContext, firDesign: FirDesignResult): AudioBuffer {
    const cacheKey = `${context.sampleRate}:${firDesign.cacheKey}`;
    const cachedBuffer = this.impulseBufferCache.get(cacheKey);
    if (cachedBuffer) {
      return cachedBuffer;
    }

    const buffer = createImpulseBuffer(context, firDesign.impulse);
    this.impulseBufferCache.set(cacheKey, buffer);
    return buffer;
  }
}

function createImpulseBuffer(context: AudioContext, impulse: Float32Array): AudioBuffer {
  const buffer = context.createBuffer(1, impulse.length, context.sampleRate);
  buffer.getChannelData(0).set(new Float32Array(impulse));
  return buffer;
}

export function getImpulseLengthFromPreset(preset: FirImpulsePreset): number {
  if (preset === "16") {
    return 16;
  }
  if (preset === "32") {
    return 32;
  }
  if (preset === "64") {
    return 64;
  }
  if (preset === "128") {
    return 128;
  }
  if (preset === "256") {
    return 256;
  }
  if (preset === "512") {
    return 512;
  }
  return 1024;
}

function createAudioContext(profile: AudioContextProfile): AudioContext {
  if (profile === "interactive-48k") {
    try {
      return new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
    } catch {
      try {
        return new AudioContext({ latencyHint: "interactive" });
      } catch {
        return new AudioContext();
      }
    }
  }

  return new AudioContext();
}

function disconnectPlaybackNodes(nodes: PlaybackNodes): void {
  safeDisconnect(nodes.originalSource);
  safeDisconnect(nodes.existingSource);
  safeDisconnect(nodes.improvedSource);
  safeDisconnect(nodes.originalGain);
  safeDisconnect(nodes.existingGain);
  safeDisconnect(nodes.improvedGain);
  nodes.existingConvolver.buffer = null;
  safeDisconnect(nodes.existingConvolver);
  if (nodes.improvedConvolver) {
    nodes.improvedConvolver.buffer = null;
    safeDisconnect(nodes.improvedConvolver);
  }
}

function safeDisconnect(node?: AudioNode): void {
  if (!node) {
    return;
  }
  try {
    node.disconnect();
  } catch {
    // Some browsers throw when a node has already been disconnected.
  }
}
