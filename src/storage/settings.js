// Settings live in chrome.storage.local when running as an extension and fall back
// to localStorage when the popup is previewed in a normal browser tab (npm run dev).

const KEY = 'cpb:settings';
const THEME_MIRROR_KEY = 'cpb:theme'; // sync mirror so the first paint has the right theme

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'system' | 'light' | 'dark'
  autoBackup: false,
  backupFrequency: 'daily', // 'session' | 'hourly' | 'daily'
  showSamples: true, // placeholder projects; hidden automatically once a real project exists
};

const hasChromeStorage = () =>
  typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export async function loadSettings() {
  try {
    if (hasChromeStorage()) {
      const res = await chrome.storage.local.get(KEY);
      return { ...DEFAULT_SETTINGS, ...(res[KEY] || {}) };
    }
    const raw = localStorage.getItem(KEY);
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch (err) {
    console.warn('[CPB] Could not load settings, using defaults.', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  try {
    localStorage.setItem(THEME_MIRROR_KEY, settings.theme);
    if (hasChromeStorage()) {
      await chrome.storage.local.set({ [KEY]: settings });
    } else {
      localStorage.setItem(KEY, JSON.stringify(settings));
    }
    return true;
  } catch (err) {
    console.error('[CPB] Could not save settings.', err);
    return false;
  }
}

export function readThemeMirror() {
  try {
    return localStorage.getItem(THEME_MIRROR_KEY) || DEFAULT_SETTINGS.theme;
  } catch {
    return DEFAULT_SETTINGS.theme;
  }
}
