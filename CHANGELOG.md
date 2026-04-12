# Changelog

Alle noemenswaardige wijzigingen in dit project, samengevat op basis van de gitgeschiedenis.

## Unreleased

- Uploadveld voor lokale MP3's wordt alleen getoond bij `Eigen MP3 uploaden`.
- Presets uitgebreid met snelle knoppen en korte demo-beschrijvingen.
- UI-uitleg toegevoegd voor display-TL bars versus FIR/convolution playback.
- README aangevuld met demo-gebruik en FIR trade-off notitie.

## f1fbe07 - UX-performance updates

- Validatielogging wordt dynamisch en alleen in development geladen.
- README gecorrigeerd voor de actuele FIR-lengte van 1025 samples.

## 0af414c - Performance optimizations

- FIR-designs worden gecachet op basis van sample rate, impulse length en playback transfer curve.
- FIR-lengte verlaagd naar 1025 taps met behoud van validatienauwkeurigheid.
- Demo-audio en impulse `AudioBuffer`s worden hergebruikt.
- Laagbewerkingen worden gedebounced voordat zware recomputatie start.
- `LayerRow` en de attenuation display zijn gememoized.
- Construction hashing toegevoegd voor stabielere recomputatie.

## 294c1c5 - FIR/convolution refactor

- Playback DSP vervangen door een FIR/convolution pipeline via `ConvolverNode`.
- Dense playback transfer curve en FIR impulse response toegevoegd.
- Debugpaneel uitgebreid met FIR-metadata en target-vs-achieved attenuation.
- Validatie uitgebreid met FIR-responschecks en een extreme betoncase.

## 24e854c - Second round of calibration

- Raw weighted broadband TL gescheiden van mapped playback broadband loss.
- Soft-knee playback loudness mapping toegevoegd.
- Debug UI toont raw en playback broadband loss apart.
- Validatie uitgebreid met sanity ranges en spacing tussen scenario's.

## e34dc98 - Calibrating the reductions with ChatGPT help

- Dedicated playback mapping module toegevoegd.
- Broadband loss, relative spectral shape, smoothing en band clamps gecentraliseerd.
- Lightweight single-leaf playback correction toegevoegd.
- Debugpaneel en `npm run validate:playback` toegevoegd.
- Cavity guardrails voor resonance penalty, porous-fill bonus en decoupled gain aangescherpt.

## 878da82 - Trying to fix low and high dB reductions

- Drie ingebouwde demo-MP3's toegevoegd.
- Demo-track selector toegevoegd naast lokale upload.
- Audio mapping aangepast zodat de hoorbare reductie niet meer als ruwe 10-band EQ werd toegepast.
- README aangevuld met audio-mapping uitleg.

## 03d057d - First build, working MVP

- React + TypeScript + Vite app opgezet.
- Materiaalbibliotheek en presets toegevoegd.
- Constructiebouwer met lagen, materiaalkeuze, dikte-invoer en presets gebouwd.
- Akoestische simulatie toegevoegd met massawet, gekoppelde massa en massa-veer-massa heuristiek.
- Web Audio playback met original/simulated A/B toegevoegd.
- Visuele 10-band attenuation display en simulatiesamenvatting toegevoegd.
- README, build scripts, TypeScript/Vite-configs en styling toegevoegd.

## f509f75 - Initial commit

- Initiële repository aangemaakt met basis README.
