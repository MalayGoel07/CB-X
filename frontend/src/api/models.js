const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV
        ? "http://localhost:8000"
        : "https://cb-x-backend.onrender.com");

export async function fetchConfiguredModels() {
  const response = await fetch(`${API_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`Failed to load configured models: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.models;
}
