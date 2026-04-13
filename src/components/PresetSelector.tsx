import { presets } from "../data/presets";

interface PresetSelectorProps {
  label?: string;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

export function PresetSelector({ label = "Preset voorbeelden", selectedPresetId, onSelectPreset }: PresetSelectorProps) {
  const value = presets.some((preset) => preset.id === selectedPresetId) ? selectedPresetId : "";

  return (
    <div className="preset-selector">
      <label className="field">
        <span>{label}</span>
        <select value={value} onChange={(event) => onSelectPreset(event.target.value)}>
          <option value="" disabled>
            Aangepaste opbouw
          </option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      <div className="preset-buttons" aria-label="Snelle preset keuze">
        {presets.map((preset) => (
          <button
            className={preset.id === selectedPresetId ? "active" : ""}
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset.id)}
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
