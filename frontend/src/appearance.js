// src/appearance.js
const THEME_KEY = "cbx-theme";
const FONT_KEY = "cbx-font-scale";

export const FONT_MIN = 0.85;
export const FONT_MAX = 1.3;
export const FONT_PRESETS = [
  { label: "Small", value: 0.9 },
  { label: "Default", value: 1 },
  { label: "Large", value: 1.15 },
  { label: "X-Large", value: 1.3 },
];

const clamp = (n) => Math.min(FONT_MAX, Math.max(FONT_MIN, n));

export function getStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return ["dark", "light", "system"].includes(t) ? t : "dark";
  } catch {
    return "dark";
  }
}

export function getStoredFontScale() {
  try {
    const v = parseFloat(localStorage.getItem(FONT_KEY));
    return Number.isFinite(v) ? clamp(v) : 1;
  } catch {
    return 1;
  }
}

function resolveTheme(theme) {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved; // native scrollbars + inputs follow
}

function applyFontScale(scale) {
  document.documentElement.style.setProperty("--fs-scale", String(scale));
}

export function setTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
  applyTheme(theme);
}

export function setFontScale(scale) {
  const next = clamp(scale);
  try { localStorage.setItem(FONT_KEY, String(next)); } catch { /* storage unavailable */ }
  applyFontScale(next);
}

// Call once before React renders so there is no flash of the wrong theme.
export function initAppearance() {
  applyTheme(getStoredTheme());
  applyFontScale(getStoredFontScale());
  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", () => {
      if (getStoredTheme() === "system") applyTheme("system");
    });
}