interface ConstructionOptionItem {
  id: string;
  name: string;
  description: string;
  textureClassName: string;
}

interface ConstructionOptionTilesProps {
  label: string;
  selectedId: string;
  options: ConstructionOptionItem[];
  onSelect: (optionId: string) => void;
}

export function ConstructionOptionTiles({
  label,
  selectedId,
  options,
  onSelect,
}: ConstructionOptionTilesProps) {
  const selectedOption = options.find((option) => option.id === selectedId);

  return (
    <details className="construction-option-picker" aria-label={label}>
      <summary className="construction-option-summary">
        <span>
          <strong>{label}</strong>
          {selectedOption ? <small>{selectedOption.name}</small> : null}
        </span>
      </summary>
      <div className="construction-option-grid">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`construction-option-button${option.id === selectedId ? " is-active" : ""}`}
            onClick={() => onSelect(option.id)}
            title={option.description}
          >
            <span className={`construction-option-texture ${option.textureClassName}`} aria-hidden="true" />
            <strong className="construction-option-title">{option.name}</strong>
            <small className="construction-option-description">{option.description}</small>
          </button>
        ))}
      </div>
    </details>
  );
}
