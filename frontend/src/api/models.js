export async function fetchConfiguredModels() {
  const response = await fetch("http://localhost:8000/models");
  if (!response.ok) {
    throw new Error(`Failed to load configured models: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.models;
}
