# Sound Simulator

Een client-side React MVP waarmee je hoort hoe muziek verandert na transmissie door een eenvoudige 1D wand- of vloerconstructie.

De app is bedoeld als perceptuele en educatieve simulatie. Het is geen officiële bouwakoestische berekening en geeft geen gecertificeerde prestaties.

## Stack

- React
- TypeScript
- Vite
- Native Web Audio API
- Volledig client-side
- Ingebouwde demo-MP3's plus optionele lokale upload

## Lokaal draaien

```bash
npm install
npm run dev
```

Build controleren:

```bash
npm run build
```

## Model in het kort

De simulatie gebruikt een vereenvoudigd 1D transmissiemodel:

- massawet voor enkele massieve lagen;
- equivalente massa voor direct gekoppelde massieve lagen;
- speciale detectie voor massa-veer-massa systemen;
- steenwol/glaswol werkt als demping in een spouw, niet als zelfstandige geluidsbarriere;
- heuristische correcties voor demping, resonantie en hogere frequenties.

Vaste frequentiebanden: 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000 en 16000 Hz.

## Akoestische aannames

Voor een enkel blad wordt de transmissieverzwakking geschat met:

```text
TL(f) = 20 * log10(m' * f) - 47
```

Voor een massa-veer-massa systeem wordt de resonantie heuristisch geschat met:

```text
fr = 160 * sqrt((1 / d) * (1 / m1' + 1 / m2'))
```

waar `d` de spouwdikte in meters is en `m1'` en `m2'` de oppervlaktemassa's van de twee bladen zijn.

## Beperkingen

Niet gemodelleerd: flankerende transmissie, ruimtereflecties, lekken, aansluitdetails, stijlen, normen, certificering en volledige plaatresonantie/coincidentie.

## Uitbreidbaarheid

- `src/data/materials.ts` bevat de materiaalbibliotheek.
- `src/data/presets.ts` bevat demo-opbouwen.
- `src/lib/acoustics.ts` bevat alle akoestische heuristiek.
- `src/lib/audio.ts` bevat de Web Audio engine.
- `src/data/audioSamples.ts` bevat de ingebouwde demo-tracks.
- `src/components` bevat kleine UI-componenten.
- `src/types.ts` bevat gedeelde types.

## Audio mapping

De EQ-grafiek toont de berekende transmissieverliezen in dB. De audio-engine gebruikt die waarden in twee stappen, zodat het signaal niet kunstmatig genormaliseerd wordt:

```text
baselineLossDb = min(transmissionLossDb per band)
outputGain = 10 ^ (-baselineLossDb / 20)
extraFilterCutDb(f) = min(transmissionLossDb(f) - baselineLossDb, maxExtraFilterCutDb)
```

De globale gain past dus de absolute minimale berekende demping toe. De filters voegen alleen de extra bandafhankelijke demping toe. Bij 200 mm beton betekent dit dat het hele signaal al fors zachter wordt voordat de hoge banden nog extra worden afgezwakt.
