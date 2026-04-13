import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayerPanel } from "./components/AudioPlayerPanel";
import { AttenuationEqDisplay } from "./components/AttenuationEqDisplay";
import { ConstructionBuilder } from "./components/ConstructionBuilder";
import { PresetSelector } from "./components/PresetSelector";
import { SimulationSummary } from "./components/SimulationSummary";
import { DebugPanel } from "./components/DebugPanel";
import { audioSamples } from "./data/audioSamples";
import { presets } from "./data/presets";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { simulateConstruction } from "./lib/acoustics";
import { AudioSimulationEngine } from "./lib/audio";
import { hashConstructionLayers } from "./lib/constructionHash";
import { designFirFilter } from "./lib/fir";
import { duplicateConstructionLayer, reorderConstructionLayers } from "./lib/layers";
import { mapTlToPlaybackEq } from "./lib/playbackMapping";
import type { ConstructionLayer, PlaybackMode } from "./types";

const DEFAULT_SAMPLE_ID = "aberrantrealities-organic-flow";

function createLayerId(): string {
  return crypto.randomUUID();
}

function materialLayer(materialId: string, thicknessMm: number): ConstructionLayer {
  return { id: createLayerId(), materialId, thicknessMm };
}

function layersFromPreset(presetId: string): ConstructionLayer[] {
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];
  return preset.layers.map((layer) => materialLayer(layer.materialId, layer.thicknessMm));
}

export default function App() {
  const [selectedPresetId, setSelectedPresetId] = useState(presets[1].id);
  const [layers, setLayers] = useState<ConstructionLayer[]>(() => layersFromPreset(presets[1].id));
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("original");
  const [selectedSampleId, setSelectedSampleId] = useState(DEFAULT_SAMPLE_ID);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFileName, setAudioFileName] = useState<string>();
  const [audioDuration, setAudioDuration] = useState<number>();
  const [hasAudio, setHasAudio] = useState(false);
  const audioEngineRef = useRef<AudioSimulationEngine | null>(null);

  if (!audioEngineRef.current) {
    audioEngineRef.current = new AudioSimulationEngine();
  }

  const debouncedLayers = useDebouncedValue(layers, 180);
  const constructionHash = useMemo(() => hashConstructionLayers(debouncedLayers), [debouncedLayers]);
  const simulationResult = useMemo(() => simulateConstruction(debouncedLayers), [constructionHash, debouncedLayers]);
  const playbackMapping = useMemo(() => mapTlToPlaybackEq(simulationResult), [simulationResult]);
  const firDesign = useMemo(
    () => (import.meta.env.DEV ? designFirFilter(playbackMapping, 48000) : undefined),
    [playbackMapping],
  );

  useEffect(() => {
    audioEngineRef.current?.setPlaybackMapping(playbackMapping, simulationResult);
  }, [playbackMapping, simulationResult]);

  useEffect(() => {
    audioEngineRef.current?.setMode(playbackMode);
  }, [playbackMode]);

  useEffect(() => {
    void handleSampleSelect(DEFAULT_SAMPLE_ID);
  }, []);

  const handlePresetSelect = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    setLayers(layersFromPreset(presetId));
  }, []);

  const handleAddLayer = useCallback(() => {
    setSelectedPresetId("custom");
    setLayers((currentLayers) => [...currentLayers, materialLayer("gipsplaat", 12.5)]);
  }, []);

  const handleDuplicateLayer = useCallback((layerId: string) => {
    setSelectedPresetId("custom");
    setLayers((currentLayers) => duplicateConstructionLayer(currentLayers, layerId, createLayerId));
  }, []);

  const handleRemoveLayer = useCallback((layerId: string) => {
    setSelectedPresetId("custom");
    setLayers((currentLayers) => currentLayers.filter((layer) => layer.id !== layerId));
  }, []);

  const handleReorderLayer = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    setSelectedPresetId("custom");
    setLayers((currentLayers) => reorderConstructionLayers(currentLayers, fromIndex, toIndex));
  }, []);

  const handleUpdateLayer = useCallback((layerId: string, updates: Partial<ConstructionLayer>) => {
    setSelectedPresetId("custom");
    setLayers((currentLayers) =>
      currentLayers.map((layer) => (layer.id === layerId ? { ...layer, ...updates } : layer)),
    );
  }, []);

  async function handleFileSelected(file: File) {
    const duration = await audioEngineRef.current?.loadFile(file);
    audioEngineRef.current?.setPlaybackMapping(playbackMapping, simulationResult);
    audioEngineRef.current?.setMode(playbackMode);
    setSelectedSampleId("upload");
    setAudioFileName(file.name);
    setAudioDuration(duration);
    setHasAudio(true);
    setIsPlaying(false);
  }

  async function handleSampleSelect(sampleId: string) {
    if (sampleId === "upload") {
      setSelectedSampleId("upload");
      return;
    }

    const sample = audioSamples.find((item) => item.id === sampleId);
    if (!sample) {
      return;
    }

    const duration = await audioEngineRef.current?.loadUrl(sample.src);
    audioEngineRef.current?.setPlaybackMapping(playbackMapping, simulationResult);
    audioEngineRef.current?.setMode(playbackMode);
    setSelectedSampleId(sampleId);
    setAudioFileName(`${sample.title} - ${sample.artist}`);
    setAudioDuration(duration);
    setHasAudio(true);
    setIsPlaying(false);
  }

  async function handlePlay() {
    await audioEngineRef.current?.play();
    setIsPlaying(audioEngineRef.current?.getIsPlaying() ?? false);
  }

  function handlePause() {
    audioEngineRef.current?.pause();
    setIsPlaying(false);
  }

  function handleStop() {
    audioEngineRef.current?.stop();
    setIsPlaying(false);
  }

  return (
    <main className="app-shell">
      <section className="intro">
        <div>
          <p className="eyebrow">Sound Simulator MVP</p>
          <h1>Hoor hoe een constructie muziek dempt.</h1>
          <p className="intro-copy">
            Bouw een eenvoudige wand- of vloeropbouw, bekijk de frequentie-afhankelijke verzwakking en vergelijk
            direct tussen het originele en doorgelaten geluid.
          </p>
        </div>
        <div className="disclaimer">
          Deze simulatie is een vereenvoudigde benadering voor beleving en vergelijking, geen officiële
          bouwakoestische berekening.
        </div>
      </section>

      <section className="preset-strip">
        <PresetSelector selectedPresetId={selectedPresetId} onSelectPreset={handlePresetSelect} />
      </section>

      <div className="workspace-grid">
        <div className="left-column">
          <ConstructionBuilder
            layers={layers}
            onAddLayer={handleAddLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onRemoveLayer={handleRemoveLayer}
            onReorderLayer={handleReorderLayer}
            onUpdateLayer={handleUpdateLayer}
          />
          <SimulationSummary result={simulationResult} />
        </div>
        <div className="right-column">
          <AudioPlayerPanel
            fileName={audioFileName}
            duration={audioDuration}
            selectedSampleId={selectedSampleId}
            hasAudio={hasAudio}
            isPlaying={isPlaying}
            playbackMode={playbackMode}
            onSampleSelected={handleSampleSelect}
            onFileSelected={handleFileSelected}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onModeChange={setPlaybackMode}
          />
          <AttenuationEqDisplay bands={simulationResult.bands} playbackMapping={playbackMapping} />
          {import.meta.env.DEV && firDesign ? (
            <DebugPanel result={simulationResult} playbackMapping={playbackMapping} firDesign={firDesign} />
          ) : null}
        </div>
      </div>
    </main>
  );
}
