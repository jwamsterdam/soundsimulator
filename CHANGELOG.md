# Changelog

Alle noemenswaardige wijzigingen in dit project, samengevat op basis van de gitgeschiedenis.

## Unreleased

- Uploadveld voor lokale MP3's wordt alleen getoond bij `Eigen MP3 uploaden`.
- Presets uitgebreid met snelle knoppen en korte demo-beschrijvingen.
- UI-uitleg toegevoegd voor display-TL bars versus FIR/convolution playback.
- README aangevuld met demo-gebruik en FIR trade-off notitie.
- Massa-lucht-massa resonantieformule gecorrigeerd voor meters en kg/m2; 2x gipsplaat met 70 mm spouw komt nu rond 100 Hz uit.
- Validatie toegevoegd voor direct gekoppelde dubbele gipsplaat versus lege en met steenwol gevulde spouw.
- Constructielagen kunnen nu worden gedupliceerd en via een drag-handle worden herschikt.
- Standaard geselecteerde demo-track is nu `Organic Flow 1015 Remastered`.
- Drag-reorder bug gefixt en `validate:layers` toegevoegd voor reorder/duplicate gedrag.
- Drag-and-drop toont nu een gekleurde rand op de opgepakte laag en een drop-position indicator.
- Drop-indicator werkt nu als echte invoegpositie tussen lagen, ook bij naar beneden slepen.
- Drop-indicator is nu zelf een ruime drop-zone, zodat cursorfeedback en zichtbaar doel synchroon blijven.
- Constructiekaart accepteert nu een drop op de laatst zichtbare indicatorpositie zolang die lijn zichtbaar is.
- Responsive layout behoudt de dual view langer en maakt laagregels compacter tussen laptop- en desktopbreedtes.
- Constructielaag-kaarten gebruiken de beschikbare breedte beter: materiaal en dikte staan boven, acties zakken eronder.
- Constructielaag-acties vormen nu een compacte 2x2 control pad met nummer, reorder, dupliceren en verwijderen.
- Materiaaltype-badge staat nu naast het label `Materiaal`, zodat het geen extra rijhoogte inneemt.
- Materiaal- en diktevelden blijven naast elkaar uitgelijnd naast het nieuwe control pad.
- Labelrijen in constructielagen hebben nu vaste hoogte, zodat materiaal- en dikte-inputs verticaal gelijk starten.
- Audio bron en luisterbediening zijn UX-matig gescheiden.
- Vergelijkingslayout toegevoegd met bovenaan een brede audiokaart en daaronder twee kolommen: huidige muur en nieuwe muur.
- Luisterstanden hernoemd naar `Origineel`, `Huidige muur` en `Nieuwe muur`.
- Nieuwe muur kan worden gevuld via preset, kopie van huidig, of huidig + geselecteerde voorzetwand.
- Doorsnede-preview toegevoegd met lijntekening/arcering per materiaaltype.
- Doorsnede-preview toont lagen nu op gedeelde millimeterschaal en centreert de opbouw in de preview-container.
- H1 schaalt nu responsief met viewportbreedte, zodat de mobiele layout niet wordt stukgeduwd.
- Web Audio cleanup aangescherpt: sources/gains/convolvers worden gedisconnect, convolver buffers worden vrijgegeven en `AudioContext.close()` wordt gebruikt bij stop/page unload.
- Audiokaart heeft nu performance-testopties voor FIR-lengte 1024, 512, 256, 128, 64, 32 en 16 plus AudioContext-profiel, inclusief `interactive` + 48 kHz testmodus.

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
