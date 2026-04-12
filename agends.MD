# Agenda

## Huidige MVP

- Houd de app volledig client-side en demo-baar in de browser.
- Bewaar de visuele EQ als begrijpelijke hoofdweergave voor transmissieverlies.
- Gebruik de FIR/convolution playback-route als bron voor de hoorbare simulatie.
- Houd display-TL, playback mapping en DSP-implementatie gescheiden.

## Korte Termijn

- Luistertesten doen met de ingebouwde tracks voor gipsplaat, OSB + gips, dubbele gipswand met steenwol en beton.
- Calibratie alleen aanpassen via `src/lib/playbackMapping.ts`, niet in de audio-engine.
- Extra presets toevoegen zodra de bestaande scenario's goed aanvoelen.
- Debugpaneel gebruiken om target-vs-achieved FIR response te controleren.

## Later

- Materiaaldatabase of backend-service toevoegen.
- Import/export van constructies of presets.
- Optionele Web Worker voor FIR-generatie als tragere apparaten nog UI-blocking tonen.
- Meer akoestische detailmodellen toevoegen zonder de MVP-flow complexer te maken.
