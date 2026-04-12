import { runPlaybackMappingValidation } from "./playbackMapping.validation";

const results = runPlaybackMappingValidation();
console.table(results);
console.log(`Playback mapping validation passed for ${results.length} scenarios.`);
