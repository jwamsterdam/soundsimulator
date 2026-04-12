import type { SimulationResult } from "../types";

interface SimulationSummaryProps {
  result: SimulationResult;
}

const systemLabels: Record<SimulationResult["systemType"], string> = {
  single_leaf: "Enkel massief blad",
  bonded_mass: "Direct gekoppelde massa",
  mass_spring_mass: "Massa-veer-massa",
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
          <dd>{result.estimatedResonanceHz ? `${Math.round(result.estimatedResonanceHz)} Hz` : "Niet van toepassing"}</dd>
        </div>
      </dl>

      {result.leafMassesKgM2 ? (
        <p className="summary-note">
          Bladmassa's: {result.leafMassesKgM2[0].toFixed(1)} en {result.leafMassesKgM2[1].toFixed(1)} kg/m2
          {result.cavityThicknessMm ? ` met ${result.cavityThicknessMm} mm spouw.` : "."}
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
