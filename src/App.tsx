import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AudioPlayerPanel } from "./components/AudioPlayerPanel";
import { AttenuationEqDisplay } from "./components/AttenuationEqDisplay";
import { ConstructionBuilder } from "./components/ConstructionBuilder";
import { ConstructionPreview } from "./components/ConstructionPreview";
import { PresetSelector } from "./components/PresetSelector";
import { SimulationSummary } from "./components/SimulationSummary";
import { DebugPanel } from "./components/DebugPanel";
import { audioSamples } from "./data/audioSamples";
import { liningSystems } from "./data/liningSystems";
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
const DEFAULT_CURRENT_PRESET_ID = "dubbele-gipsplaat-direct";
const DEFAULT_NEW_PRESET_ID = "dubbele-gipswand-steenwol";

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

function cloneLayers(layers: ConstructionLayer[]): ConstructionLayer[] {
  return layers.map((layer) => materialLayer(layer.materialId, layer.thicknessMm));
}

function appendTemplateLayers(layers: ConstructionLayer[], templateLayers: Omit<ConstructionLayer, "id">[]): ConstructionLayer[] {
  return [...cloneLayers(layers), ...templateLayers.map((layer) => materialLayer(layer.materialId, layer.thicknessMm))];
}

export default function App() {
  const [selectedCurrentPresetId, setSelectedCurrentPresetId] = useState(DEFAULT_CURRENT_PRESET_ID);
  const [selectedNewPresetId, setSelectedNewPresetId] = useState(DEFAULT_NEW_PRESET_ID);
  const [selectedLiningId, setSelectedLiningId] = useState(liningSystems[0].id);
  const [currentLayers, setCurrentLayers] = useState<ConstructionLayer[]>(() => layersFromPreset(DEFAULT_CURRENT_PRESET_ID));
  const [newLayers, setNewLayers] = useState<ConstructionLayer[]>(() => layersFromPreset(DEFAULT_NEW_PRESET_ID));
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

  const debouncedCurrentLayers = useDebouncedValue(currentLayers, 180);
  const debouncedNewLayers = useDebouncedValue(newLayers, 180);
  const currentHash = useMemo(() => hashConstructionLayers(debouncedCurrentLayers), [debouncedCurrentLayers]);
  const newHash = useMemo(() => hashConstructionLayers(debouncedNewLayers), [debouncedNewLayers]);
  const currentSimulationResult = useMemo(
    () => simulateConstruction(debouncedCurrentLayers),
    [currentHash, debouncedCurrentLayers],
  );
  const newSimulationResult = useMemo(() => simulateConstruction(debouncedNewLayers), [newHash, debouncedNewLayers]);
  const currentPlaybackMapping = useMemo(() => mapTlToPlaybackEq(currentSimulationResult), [currentSimulationResult]);
  const newPlaybackMapping = useMemo(() => mapTlToPlaybackEq(newSimulationResult), [newSimulationResult]);
  const selectedLining = useMemo(
    () => liningSystems.find((system) => system.id === selectedLiningId) ?? liningSystems[0],
    [selectedLiningId],
  );
  const displayedResult = playbackMode === "improved" ? newSimulationResult : currentSimulationResult;
  const displayedMapping = playbackMode === "improved" ? newPlaybackMapping : currentPlaybackMapping;
  const modeOptions = useMemo(
    () => [
      { mode: "original" as const, label: "Origineel" },
      { mode: "existing" as const, label: "Huidige muur" },
      { mode: "improved" as const, label: "Nieuwe muur" },
    ],
    [],
  );
  const firDesign = useMemo(
    () => (import.meta.env.DEV ? designFirFilter(displayedMapping, 48000) : undefined),
    [displayedMapping],
  );

  useEffect(() => {
    audioEngineRef.current?.setPlaybackMappings(currentPlaybackMapping, newPlaybackMapping, displayedResult);
  }, [currentPlaybackMapping, displayedResult, newPlaybackMapping]);

  useEffect(() => {
    audioEngineRef.current?.setMode(playbackMode);
  }, [playbackMode]);

  useEffect(() => {
    void handleSampleSelect(DEFAULT_SAMPLE_ID);
  }, []);

  const handleCurrentPresetSelect = useCallback((presetId: string) => {
    setSelectedCurrentPresetId(presetId);
    setCurrentLayers(layersFromPreset(presetId));
  }, []);

  const handleNewPresetSelect = useCallback((presetId: string) => {
    setSelectedNewPresetId(presetId);
    setNewLayers(layersFromPreset(presetId));
  }, []);

  const handleCopyCurrentToNew = useCallback(() => {
    setSelectedNewPresetId("custom");
    setNewLayers(cloneLayers(currentLayers));
  }, [currentLayers]);

  const handleApplyLiningToNew = useCallback(() => {
    setSelectedNewPresetId("custom");
    setNewLayers(appendTemplateLayers(currentLayers, selectedLining.layers));
    setPlaybackMode("improved");
  }, [currentLayers, selectedLining]);

  const currentLayerHandlers = useLayerHandlers(setSelectedCurrentPresetId, setCurrentLayers);
  const newLayerHandlers = useLayerHandlers(setSelectedNewPresetId, setNewLayers);

  async function handleFileSelected(file: File) {
    const duration = await audioEngineRef.current?.loadFile(file);
    audioEngineRef.current?.setPlaybackMappings(currentPlaybackMapping, newPlaybackMapping, displayedResult);
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
    audioEngineRef.current?.setPlaybackMappings(currentPlaybackMapping, newPlaybackMapping, displayedResult);
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
          <h1>Vergelijk huidig en nieuw geluid door een constructie.</h1>
          <p className="intro-copy">
            Kies een audiofragment, modelleer de huidige muur en ontwerp daarnaast een nieuwe oplossing: een
            voorzetwand of een volledig vervangende constructie.
          </p>
        </div>
        <div className="disclaimer">
          Deze simulatie is een vereenvoudigde benadering voor beleving en vergelijking, geen officiële
          bouwakoestische berekening.
        </div>
      </section>

      <div className="top-audio-row">
        <AudioPlayerPanel
          fileName={audioFileName}
          duration={audioDuration}
          selectedSampleId={selectedSampleId}
          hasAudio={hasAudio}
          isPlaying={isPlaying}
          playbackMode={playbackMode}
          modeOptions={modeOptions}
          onSampleSelected={handleSampleSelect}
          onFileSelected={handleFileSelected}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onModeChange={setPlaybackMode}
        />
      </div>

      <div className="comparison-grid">
        <section className="comparison-column" aria-labelledby="current-wall-title">
          <div className="comparison-header">
            <div>
              <p className="eyebrow">Bestaande situatie</p>
              <h2 id="current-wall-title">Huidige muur</h2>
            </div>
          </div>
          <PresetSelector
            label="Preset huidige muur"
            selectedPresetId={selectedCurrentPresetId}
            onSelectPreset={handleCurrentPresetSelect}
          />
          <ConstructionBuilder
            title="Huidige constructie"
            eyebrow="Laagopbouw"
            layers={currentLayers}
            {...currentLayerHandlers}
          />
          <ConstructionPreview title="Doorsnede huidige muur" layers={debouncedCurrentLayers} />
          <SimulationSummary result={currentSimulationResult} />
        </section>

        <section className="comparison-column" aria-labelledby="new-wall-title">
          <div className="comparison-header">
            <div>
              <p className="eyebrow">Ontwerpvariant</p>
              <h2 id="new-wall-title">Nieuwe muur</h2>
            </div>
          </div>
          <PresetSelector
            label="Preset nieuwe muur"
            selectedPresetId={selectedNewPresetId}
            onSelectPreset={handleNewPresetSelect}
          />
          <div className="new-wall-tools">
            <button className="ghost-button secondary-action" type="button" onClick={handleCopyCurrentToNew}>
              Kopieer huidige muur
            </button>
            <label className="field lining-field">
              <span className="field-label">Voorzetwand toevoegen</span>
              <select value={selectedLiningId} onChange={(event) => setSelectedLiningId(event.target.value)}>
                {liningSystems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="ghost-button" type="button" onClick={handleApplyLiningToNew}>
              Huidige muur + voorzetwand
            </button>
          </div>
          <ConstructionBuilder
            title="Nieuwe constructie"
            eyebrow="Laagopbouw"
            layers={newLayers}
            {...newLayerHandlers}
          />
          <ConstructionPreview title="Doorsnede nieuwe muur" layers={debouncedNewLayers} />
          <SimulationSummary result={newSimulationResult} />
        </section>
      </div>

      <div className="analysis-grid">
        <AttenuationEqDisplay bands={displayedResult.bands} playbackMapping={displayedMapping} />
        {import.meta.env.DEV && firDesign ? (
          <DebugPanel result={displayedResult} playbackMapping={displayedMapping} firDesign={firDesign} />
        ) : null}
      </div>
    </main>
  );
}

function useLayerHandlers(
  setSelectedPresetId: (presetId: string) => void,
  setLayers: Dispatch<SetStateAction<ConstructionLayer[]>>,
) {
  const handleAddLayer = useCallback(() => {
    setSelectedPresetId("custom");
    setLayers((layers) => [...layers, materialLayer("gipsplaat", 12.5)]);
  }, [setLayers, setSelectedPresetId]);

  const handleDuplicateLayer = useCallback(
    (layerId: string) => {
      setSelectedPresetId("custom");
      setLayers((layers) => duplicateConstructionLayer(layers, layerId, createLayerId));
    },
    [setLayers, setSelectedPresetId],
  );

  const handleRemoveLayer = useCallback(
    (layerId: string) => {
      setSelectedPresetId("custom");
      setLayers((layers) => layers.filter((layer) => layer.id !== layerId));
    },
    [setLayers, setSelectedPresetId],
  );

  const handleReorderLayer = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) {
        return;
      }
      setSelectedPresetId("custom");
      setLayers((layers) => reorderConstructionLayers(layers, fromIndex, toIndex));
    },
    [setLayers, setSelectedPresetId],
  );

  const handleUpdateLayer = useCallback(
    (layerId: string, updates: Partial<ConstructionLayer>) => {
      setSelectedPresetId("custom");
      setLayers((layers) => layers.map((layer) => (layer.id === layerId ? { ...layer, ...updates } : layer)));
    },
    [setLayers, setSelectedPresetId],
  );

  return {
    onAddLayer: handleAddLayer,
    onDuplicateLayer: handleDuplicateLayer,
    onRemoveLayer: handleRemoveLayer,
    onReorderLayer: handleReorderLayer,
    onUpdateLayer: handleUpdateLayer,
  };
}
