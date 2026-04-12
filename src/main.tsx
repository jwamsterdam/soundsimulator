import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { runPlaybackMappingValidation } from "./lib/playbackMapping.validation";
import "./styles.css";

if (import.meta.env.DEV) {
  console.table(runPlaybackMappingValidation());
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
