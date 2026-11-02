export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "https://cb-x-backend.onrender.com");

// local-mode settings (all stored in the visitor's browser)
export const LS = {
  mode: "local_mode",       // "1" = use local Ollama
  url: "ollama_url",        // default http://localhost:11434
  models: "local_models",   // JSON {router, research, writer, coder, maths}
};