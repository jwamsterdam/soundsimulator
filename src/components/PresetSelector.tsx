import { presets } from "../data/presets";

interface PresetSelectorProps {
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

export function PresetSelector({ selectedPresetId, onSelectPreset }: PresetSelectorProps) {
  const value = presets.some((preset) => preset.id === selectedPresetId) ? selectedPresetId : "";

  return (
    <label className="field">
      <span>Preset voorbeelden</span>
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
  );
}
