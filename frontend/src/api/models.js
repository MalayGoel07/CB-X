import { API_BASE as API_BASE_URL } from "./config";

export async function fetchConfiguredModels() {
  const response = await fetch(`${API_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`Failed to load configured models: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.models;
}
