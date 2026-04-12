import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

if (import.meta.env.DEV) {
  void import("./lib/playbackMapping.validation").then(({ runPlaybackMappingValidation }) => {
    console.table(runPlaybackMappingValidation());
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
