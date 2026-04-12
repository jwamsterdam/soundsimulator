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

Playback mapping scenario's controleren:

```bash
npm run validate:playback
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

## Display versus playback mapping

De EQ-grafiek toont de berekende transmissieverliezen in dB. De audio-engine gebruikt een aparte playback mapping, zodat de ruwe wandcurve inspecteerbaar blijft en de DSP niet per ongeluk veel te veel filterstapeling veroorzaakt.

Breedbandverlies wordt berekend uit gewogen midden- en spraakrelevante banden:

```text
rawBroadbandLossDb = weightedAverage(TL_i, perceptualWeights_i)
playbackBroadbandLossDb = mapPhysicalBroadbandToPlaybackLoss(rawBroadbandLossDb, systemType, metadata)
outputGain = 10 ^ (-playbackBroadbandLossDb / 20)
relativeShapeDb(f) = TL(f) - rawBroadbandLossDb
```

De playback broadband mapping is een soft-knee calibratielaag voor luisterbaarheid. Lichte enkelblads systemen worden sterker omlaag gecomprimeerd, zware massieve systemen behouden meer verlies. De relatieve vorm wordt daarna licht gesmoothd en per band begrensd voordat deze naar een FIR transfer curve gaat. Voor lichte enkelblads platen wordt de playback-vorm boven 1 kHz extra afgevlakt, zodat een 12.5 mm gipsplaat niet klinkt als een zware steenachtige wand. Dit wijzigt de weergegeven TL-curve niet.

De audio-engine gebruikt geen gestapelde EQ-filters meer. De playback curve wordt logaritmisch geinterpoleerd naar een dense magnitude response, omgezet naar een 2049-sample lineair-fase FIR impulse response en afgespeeld via een Web Audio `ConvolverNode` met `normalize=false`.

In development toont de app een debugpaneel met systeemtype, massa's, resonantie, display TL, broadband loss, FIR metadata en target-versus-achieved attenuation per band. Bij app-start draaien ook deterministische validatiescenario's voor gipsplaat, beton, extreme beton, dubbele gipswand met wol en OSB + gips.
