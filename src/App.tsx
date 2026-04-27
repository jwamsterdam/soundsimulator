import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AudioPlayerPanel } from "./components/AudioPlayerPanel";
import { AttenuationEqDisplay } from "./components/AttenuationEqDisplay";
import { ConstructionBuilder } from "./components/ConstructionBuilder";
import { ConstructionOptionTiles } from "./components/ConstructionOptionTiles";
import { ConstructionPreview } from "./components/ConstructionPreview";
import { SimulationSummary } from "./components/SimulationSummary";
import { DebugPanel } from "./components/DebugPanel";
import { audioSamples } from "./data/audioSamples";
import { currentWallOptions, newWallActions } from "./data/wallOptions";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { simulateConstruction } from "./lib/acoustics";
import { AudioSimulationEngine, getImpulseLengthFromPreset } from "./lib/audio";
import { hashConstructionLayers } from "./lib/constructionHash";
import { designFirFilter } from "./lib/fir";
import { duplicateConstructionLayer, reorderConstructionLayers } from "./lib/layers";
import { mapTlToPlaybackEq, normalizePlaybackMappingForAudition } from "./lib/playbackMapping";
import type { AudioPerformanceSettings, ConstructionLayer, PlaybackMode, PlaybackVolumeMode } from "./types";

const DEFAULT_SAMPLE_ID = "music-aberrantrealities-organic-flow";
const DEFAULT_CURRENT_PRESET_ID = "kalkzandsteen";
const DEFAULT_NEW_PRESET_ID = "lining-2x-gipsplaat-ontkoppeld";
const DEFAULT_SAMPLE = audioSamples.find((item) => item.id === DEFAULT_SAMPLE_ID);
const HIDDEN_AUDIO_RELEASE_DELAY_MS = 1500;

function createLayerId(): string {
  return crypto.randomUUID();
}

function materialLayer(materialId: string, thicknessMm: number): ConstructionLayer {
  return { id: createLayerId(), materialId, thicknessMm };
}

function layersFromPreset(presetId: string): ConstructionLayer[] {
  const preset = currentWallOptions.find((item) => item.id === presetId) ?? currentWallOptions[0];
  return preset.layers.map((layer) => materialLayer(layer.materialId, layer.thicknessMm));
}

function cloneLayers(layers: ConstructionLayer[]): ConstructionLayer[] {
  return layers.map((layer) => materialLayer(layer.materialId, layer.thicknessMm));
}

function appendTemplateLayers(layers: ConstructionLayer[], templateLayers: Omit<ConstructionLayer, "id">[]): ConstructionLayer[] {
  return [...cloneLayers(layers), ...templateLayers.map((layer) => materialLayer(layer.materialId, layer.thicknessMm))];
}

function textureClassForCurrentPreset(presetId: string): string {
  return currentWallOptions.find((item) => item.id === presetId)?.textureClassName ?? "construction-option-texture-custom";
}

export default function App() {
  const [selectedCurrentPresetId, setSelectedCurrentPresetId] = useState(DEFAULT_CURRENT_PRESET_ID);
  const [selectedNewPresetId, setSelectedNewPresetId] = useState(DEFAULT_NEW_PRESET_ID);
  const [currentLayers, setCurrentLayers] = useState<ConstructionLayer[]>(() => layersFromPreset(DEFAULT_CURRENT_PRESET_ID));
  const [newLayers, setNewLayers] = useState<ConstructionLayer[]>(() => layersFromNewWallAction(DEFAULT_NEW_PRESET_ID, layersFromPreset(DEFAULT_CURRENT_PRESET_ID)));
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("existing");
  const [playbackVolumeMode, setPlaybackVolumeMode] = useState<PlaybackVolumeMode>("comparison");
  const [audioPerformanceSettings, setAudioPerformanceSettings] = useState<AudioPerformanceSettings>({
    firImpulsePreset: "128",
    audioContextProfile: "default",
  });
  const [selectedSampleId, setSelectedSampleId] = useState(DEFAULT_SAMPLE_ID);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFileName, setAudioFileName] = useState<string | undefined>(() =>
    DEFAULT_SAMPLE ? `${DEFAULT_SAMPLE.title} - ${DEFAULT_SAMPLE.artist}` : undefined,
  );
  const [audioDuration, setAudioDuration] = useState<number>();
  const [hasAudio, setHasAudio] = useState(false);
  const audioEngineRef = useRef<AudioSimulationEngine | null>(null);
  const hiddenAudioReleaseTimerRef = useRef<number | undefined>(undefined);

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
  const currentAuditionMapping = useMemo(
    () => normalizePlaybackMappingForAudition(currentPlaybackMapping),
    [currentPlaybackMapping],
  );
  const newAuditionMapping = useMemo(
    () => normalizePlaybackMappingForAudition(newPlaybackMapping, currentPlaybackMapping),
    [currentPlaybackMapping, newPlaybackMapping],
  );
  const activeCurrentPlaybackMapping = playbackVolumeMode === "comparison" ? currentAuditionMapping : currentPlaybackMapping;
  const activeNewPlaybackMapping = playbackVolumeMode === "comparison" ? newAuditionMapping : newPlaybackMapping;
  const displayedResult = playbackMode === "improved" ? newSimulationResult : currentSimulationResult;
  const displayedMapping = playbackMode === "improved" ? newPlaybackMapping : currentPlaybackMapping;
  const displayedPlaybackMapping =
    playbackMode === "improved" ? activeNewPlaybackMapping : activeCurrentPlaybackMapping;
  const modeOptions = useMemo(
    () => [
      { mode: "existing" as const, label: "Huidige muur" },
      { mode: "improved" as const, label: "Nieuwe muur" },
    ],
    [],
  );
  const firDesign = useMemo(
    () =>
      designFirFilter(
        displayedPlaybackMapping,
        48000,
        getImpulseLengthFromPreset(audioPerformanceSettings.firImpulsePreset),
      ),
    [audioPerformanceSettings.firImpulsePreset, displayedPlaybackMapping],
  );
  const performanceDebugInfo = useMemo(
    () => {
      const requestedImpulseLength = getImpulseLengthFromPreset(audioPerformanceSettings.firImpulsePreset);
      const cachedFirDesign = designFirFilter(displayedPlaybackMapping, 48000, requestedImpulseLength);
      return {
        requestedImpulseLength,
        effectiveImpulseLength: firDesign.impulseLength,
        sampleRate: firDesign.sampleRate,
        maxFirErrorDb: Math.max(...firDesign.bandChecks.map((check) => Math.abs(check.errorDb))),
        cacheHit: cachedFirDesign === firDesign,
      };
    },
    [audioPerformanceSettings.firImpulsePreset, displayedPlaybackMapping, firDesign],
  );
  const newWallActionsWithCurrentTexture = useMemo(
    () =>
      newWallActions.map((action) =>
        action.id === "copy-current"
          ? { ...action, textureClassName: textureClassForCurrentPreset(selectedCurrentPresetId) }
          : action,
      ),
    [selectedCurrentPresetId],
  );

  useEffect(() => {
    audioEngineRef.current?.setPlaybackMappings(activeCurrentPlaybackMapping, activeNewPlaybackMapping, displayedResult);
  }, [activeCurrentPlaybackMapping, activeNewPlaybackMapping, displayedResult]);

  useEffect(() => {
    audioEngineRef.current?.setPerformanceSettings(audioPerformanceSettings);
  }, [audioPerformanceSettings]);

  useEffect(() => {
    audioEngineRef.current?.setMode(playbackMode);
  }, [playbackMode]);

  useEffect(() => {
    void loadSelectedDemoSample(DEFAULT_SAMPLE_ID);
  }, []);

  useEffect(() => {
    const engine = audioEngineRef.current;
    const disposeEngine = () => {
      if (hiddenAudioReleaseTimerRef.current !== undefined) {
        window.clearTimeout(hiddenAudioReleaseTimerRef.current);
        hiddenAudioReleaseTimerRef.current = undefined;
      }
      void engine?.dispose();
    };
    const releaseHiddenAudio = () => {
      if (hiddenAudioReleaseTimerRef.current !== undefined) {
        window.clearTimeout(hiddenAudioReleaseTimerRef.current);
        hiddenAudioReleaseTimerRef.current = undefined;
      }
      if (document.visibilityState !== "hidden") {
        return;
      }
      if (!engine?.getIsPlaying()) {
        return;
      }
      hiddenAudioReleaseTimerRef.current = window.setTimeout(() => {
        hiddenAudioReleaseTimerRef.current = undefined;
        if (document.visibilityState !== "hidden" || !engine?.getIsPlaying()) {
          return;
        }
        void engine?.stopAndRelease();
        setIsPlaying(false);
      }, HIDDEN_AUDIO_RELEASE_DELAY_MS);
    };

    window.addEventListener("pagehide", disposeEngine);
    window.addEventListener("beforeunload", disposeEngine);
    document.addEventListener("visibilitychange", releaseHiddenAudio);
    return () => {
      window.removeEventListener("pagehide", disposeEngine);
      window.removeEventListener("beforeunload", disposeEngine);
      document.removeEventListener("visibilitychange", releaseHiddenAudio);
      disposeEngine();
    };
  }, []);

  const handleCurrentPresetSelect = useCallback((presetId: string) => {
    setSelectedCurrentPresetId(presetId);
    setCurrentLayers(layersFromPreset(presetId));
  }, []);

  const handleNewPresetSelect = useCallback((presetId: string) => {
    setSelectedNewPresetId(presetId);
    setNewLayers(layersFromNewWallAction(presetId, currentLayers));
    setPlaybackMode("improved");
  }, [currentLayers]);

  const currentLayerHandlers = useLayerHandlers(setSelectedCurrentPresetId, setCurrentLayers);
  const newLayerHandlers = useLayerHandlers(setSelectedNewPresetId, setNewLayers);

  async function handleFileSelected(file: File) {
    const duration = await audioEngineRef.current?.loadFile(file);
    audioEngineRef.current?.setPlaybackMappings(activeCurrentPlaybackMapping, activeNewPlaybackMapping, displayedResult);
    audioEngineRef.current?.setMode(playbackMode);
    setSelectedSampleId("upload");
    setAudioFileName(file.name);
    setAudioDuration(duration);
    setHasAudio(true);
    setIsPlaying(false);
  }

  async function loadSelectedDemoSample(sampleId: string): Promise<boolean> {
    const sample = audioSamples.find((item) => item.id === sampleId);
    if (!sample) {
      return false;
    }

    const duration = await audioEngineRef.current?.loadUrl(sample.src);
    audioEngineRef.current?.setPlaybackMappings(activeCurrentPlaybackMapping, activeNewPlaybackMapping, displayedResult);
    audioEngineRef.current?.setMode(playbackMode);
    setAudioFileName(`${sample.title} - ${sample.artist}`);
    setAudioDuration(duration);
    setHasAudio(true);
    setIsPlaying(false);
    return true;
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

    setSelectedSampleId(sampleId);
    setAudioFileName(`${sample.title} - ${sample.artist}`);
    setAudioDuration(undefined);
    setHasAudio(false);
    setIsPlaying(false);
  }

  async function handlePlay() {
    await audioEngineRef.current?.unlockForUserGesture();
    if (!hasAudio && selectedSampleId !== "upload") {
      const loaded = await loadSelectedDemoSample(selectedSampleId);
      if (!loaded) {
        return;
      }
    }
    await audioEngineRef.current?.play();
    setIsPlaying(audioEngineRef.current?.getIsPlaying() ?? false);
  }

  async function handleOriginalReference() {
    await audioEngineRef.current?.unlockForUserGesture();
    if (!hasAudio && selectedSampleId !== "upload") {
      const loaded = await loadSelectedDemoSample(selectedSampleId);
      if (!loaded) {
        return;
      }
    }
    setPlaybackMode("original");
    audioEngineRef.current?.setMode("original");
    if (!audioEngineRef.current?.getIsPlaying()) {
      await audioEngineRef.current?.play();
    }
    setIsPlaying(audioEngineRef.current?.getIsPlaying() ?? false);
  }

  function handlePause() {
    audioEngineRef.current?.pause();
    setIsPlaying(false);
  }

  function handleStop() {
    void audioEngineRef.current?.stopAndRelease();
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
          hasAudio={hasAudio || selectedSampleId !== "upload"}
          isPlaying={isPlaying}
          playbackMode={playbackMode}
          playbackVolumeMode={playbackVolumeMode}
          performanceSettings={audioPerformanceSettings}
          performanceDebugInfo={performanceDebugInfo}
          modeOptions={modeOptions}
          onSampleSelected={handleSampleSelect}
          onFileSelected={handleFileSelected}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onModeChange={setPlaybackMode}
          onVolumeModeChange={setPlaybackVolumeMode}
          onPerformanceSettingsChange={setAudioPerformanceSettings}
          onOriginalReference={handleOriginalReference}
        />
      </div>

      <section className="comparison-stage panel" aria-labelledby="comparison-stage-title">
        <div className="comparison-stage-header">
          <div>
            <p className="eyebrow">Van bestaand naar nieuw</p>
            <h2 id="comparison-stage-title">Vergelijk de huidige en nieuwe situatie zij aan zij.</h2>
          </div>
          <p className="comparison-stage-copy">
            Kies links de bestaande woningscheidende wand en bouw rechts direct verder naar de verbeterde oplossing.
          </p>
        </div>

        <div className="comparison-grid">
          <section className="comparison-column comparison-column-existing" aria-labelledby="current-wall-title">
            <div className="comparison-header">
              <div className="comparison-header-badge">1</div>
              <div>
                <p className="comparison-flow-tag">Van</p>
                <p className="eyebrow">Bestaande situatie</p>
                <h2 id="current-wall-title">Huidige muur</h2>
                <p className="comparison-header-copy">
                  Kies het type wand dat het beste aansluit op de huidige woningscheiding.
                </p>
              </div>
            </div>
            <ConstructionOptionTiles
              label="Kies een wandtype"
              selectedId={selectedCurrentPresetId}
              options={currentWallOptions}
              onSelect={handleCurrentPresetSelect}
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

          <div className="comparison-connector" aria-hidden="true">
            <span className="comparison-connector-line" />
            <span className="comparison-connector-chip">naar</span>
            <span className="comparison-connector-line" />
          </div>

          <section className="comparison-column comparison-column-new" aria-labelledby="new-wall-title">
            <div className="comparison-header">
              <div className="comparison-header-badge">2</div>
              <div>
                <p className="comparison-flow-tag">Naar</p>
                <p className="eyebrow">Ontwerpvariant</p>
                <h2 id="new-wall-title">Nieuwe muur</h2>
                <p className="comparison-header-copy">
                  Start vanuit de huidige muur en voeg een voorzetwand of kopie toe als nieuwe situatie.
                </p>
              </div>
            </div>
            <ConstructionOptionTiles
              label="Kopieer of voeg een voorzetwand toe"
              selectedId={selectedNewPresetId}
              options={newWallActionsWithCurrentTexture}
              onSelect={handleNewPresetSelect}
            />
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
      </section>

      <div className="analysis-grid">
        <AttenuationEqDisplay
          currentBands={currentSimulationResult.bands}
          newBands={newSimulationResult.bands}
          playbackMapping={displayedMapping}
        />
        <DebugPanel result={displayedResult} playbackMapping={displayedPlaybackMapping} firDesign={firDesign} />
      </div>
    </main>
  );
}

function layersFromNewWallAction(actionId: string, currentLayers: ConstructionLayer[]): ConstructionLayer[] {
  if (actionId === "copy-current") {
    return cloneLayers(currentLayers);
  }

  const action = newWallActions.find((item) => item.id === actionId);
  if (!action) {
    return cloneLayers(currentLayers);
  }

  return appendTemplateLayers(currentLayers, action.layers);
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
