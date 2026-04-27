import type { SimulationResult } from "../types";

interface SimulationSummaryProps {
  result: SimulationResult;
}

const systemLabels: Record<SimulationResult["systemType"], string> = {
  single_leaf: "Enkel massief blad",
  bonded_mass: "Direct gekoppelde massa",
  mass_spring_mass: "Massa-veer-massa",
  mass_spring_mass_spring_mass: "Massa-veer-massa-veer-massa",
  mixed_or_ambiguous: "Gemengd of onduidelijk",
};

export function SimulationSummary({ result }: SimulationSummaryProps) {
  return (
    <section className="panel summary-panel" aria-labelledby="summary-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Modeluitleg</p>
          <h2 id="summary-title">Samenvatting</h2>
        </div>
      </div>

      <dl className="summary-grid">
        <div>
          <dt>Systeemtype</dt>
          <dd>{systemLabels[result.systemType]}</dd>
        </div>
        <div>
          <dt>Totale oppervlaktemassa</dt>
          <dd>{result.totalSurfaceMassKgM2.toFixed(1)} kg/m2</dd>
        </div>
        <div>
          <dt>Spouwdemping</dt>
          <dd>{result.hasPorousFill ? "Porous fill gedetecteerd" : "Geen porous fill in hoofdcaviteit"}</dd>
        </div>
        <div>
          <dt>Resonantiegebied</dt>
          <dd>
            {result.resonanceFrequenciesHz?.length
              ? result.resonanceFrequenciesHz.map((frequencyHz) => `${Math.round(frequencyHz)} Hz`).join(" / ")
              : "Niet van toepassing"}
          </dd>
        </div>
      </dl>

      {result.leafMassesKgM2 ? (
        <p className="summary-note">
          Bladmassa's: {formatList(result.leafMassesKgM2.map((mass) => `${mass.toFixed(1)} kg/m2`))}
          {result.cavityThicknessesMm?.length
            ? ` met ${formatList(result.cavityThicknessesMm.map((thicknessMm) => `${thicknessMm} mm`))} spouw.`
            : "."}
        </p>
      ) : null}

      {result.warnings.length > 0 ? (
        <div className="warnings">
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  return `${values.slice(0, -1).join(", ")} en ${values[values.length - 1]}`;
}
