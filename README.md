# Sound Simulator

Een client-side React MVP waarmee je hoort hoe muziek verandert na transmissie door een eenvoudige 1D wand- of vloerconstructie.

De app is bedoeld als perceptuele en educatieve simulatie. Het is geen officiële bouwakoestische berekening en geeft geen gecertificeerde prestaties.

## Stack

- React
- TypeScript
- Vite
- Native Web Audio API
- Volledig client-side
- Ingebouwde demo-MP3's plus optionele lokale upload via "Eigen MP3 uploaden"

## Demo-gebruik

- Gebruik de presetknoppen om snel lichte platen, spouwconstructies en zware massa te vergelijken.
- De ingebouwde audiofragmenten zijn muziekgericht.
- Voor een spraakgerichte test kies je `Eigen MP3 uploaden` en gebruik je bij voorkeur een droge stemopname zonder muziek of galm.
- De audio bron staat los van `Luisteren`, zodat je snel kunt wisselen tussen `Origineel`, `Huidige muur` en `Nieuwe muur`.
- De app werkt als vergelijking tussen twee constructies: links de huidige muur, rechts een nieuwe muur. De nieuwe muur kan een kopie met voorzetwand zijn of een volledig vervangende constructie.
- De doorsnede-preview toont de laagopbouw als eenvoudige lijntekening met materiaal-arcering.

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

## Performance

De FIR-engine is geoptimaliseerd voor snelle interactie:

- FIR designs worden gecachet op basis van sample rate, impulse length en playback transfer curve.
- Demo-audio wordt per URL eenmaal gedecodeerd en daarna hergebruikt.
- Impulse `AudioBuffer`s worden hergebruikt wanneer dezelfde FIR opnieuw nodig is.
- Bij stop en page unload worden Web Audio nodes expliciet gedisconnect en wordt de `AudioContext` gesloten, zodat Safari/iOS geheugen voor convolvers en impulse buffers beter vrij kan geven.
- Laagbewerkingen worden kort gedebounced voordat akoestiek/FIR opnieuw worden berekend, zodat typen in diktevelden de UI niet blokkeert.
- De FIR-lengte staat standaard op 1024 requested / 1025 taps; via de audiokaart kan tijdelijk ook met 512, 256, 128, 64, 32 en 16 worden getest. Omdat de FIR symmetrisch wordt opgebouwd, worden die intern afgerond naar 513, 257, 129, 65, 33 en 17 taps.
- De AudioContext gebruikt standaard het browserprofiel. Voor prestatietests is er ook een profiel met `latencyHint: "interactive"` en `sampleRate: 48000`; browsers die dit niet accepteren vallen terug naar een veiligere context.
- Dev-only debug FIR preview en validatielogging draaien niet in productie.

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
fr = sqrt(rho_air * c^2) / (2*pi) * sqrt((1 / d) * (1 / m1' + 1 / m2'))
```

waar `d` de spouwdikte in meters is en `m1'` en `m2'` de oppervlaktemassa's van de twee bladen zijn. Met lucht bij kamertemperatuur is de constante ongeveer `60` voor deze units. Voor twee gipsplaten van circa 10 kg/m2 met een 70 mm spouw komt dit uit rond 100 Hz. Minerale wol verschuift deze systeemresonantie niet, maar dempt de resonantiedip en geeft een bescheiden verbetering boven resonantie.

## Beperkingen

Niet gemodelleerd: flankerende transmissie, ruimtereflecties, lekken, aansluitdetails, stijlen, normen, certificering en volledige plaatresonantie/coincidentie.

## Uitbreidbaarheid

- `src/data/materials.ts` bevat de materiaalbibliotheek.
- `src/data/presets.ts` bevat demo-opbouwen.
- `src/data/liningSystems.ts` bevat demo-voorzetwanden voor vergelijkingsscenario's.
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

De audio-engine gebruikt geen gestapelde EQ-filters meer. De playback curve wordt logaritmisch geinterpoleerd naar een dense magnitude response, omgezet naar een 1025-sample lineair-fase FIR impulse response en afgespeeld via een Web Audio `ConvolverNode` met `normalize=false`.

FIR trade-off: deze MVP stuurt vooral op een stabiele magnitude response. De lineair-fase FIR kan een kleine vaste latency en pre/post-ringing introduceren, maar houdt de transfer reproduceerbaar en goed inspecteerbaar.

In development toont de app een debugpaneel met systeemtype, massa's, resonantie, display TL, broadband loss, FIR metadata en target-versus-achieved attenuation per band. Bij app-start draaien ook deterministische validatiescenario's voor gipsplaat, beton, extreme beton, dubbele gipswand met wol en OSB + gips.
