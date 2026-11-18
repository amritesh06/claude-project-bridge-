// INTERIM persistence for real projects (chrome.storage.local, localStorage in browser preview).
// Phase 5 replaces this with IndexedDB (storage/database.js) and migrates this key.

const KEY = 'cpb:interim:projects';
const hasChrome = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export async function loadProjects() {
  try {
    if (hasChrome()) {
      const res = await chrome.storage.local.get(KEY);
      return Array.isArray(res[KEY]) ? res[KEY] : [];
    }
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[CPB] Could not load saved projects.', err);
    return [];
  }
}

export async function saveProjects(projects) {
  try {
    if (hasChrome()) await chrome.storage.local.set({ [KEY]: projects });
    else localStorage.setItem(KEY, JSON.stringify(projects));
    return true;
  } catch (err) {
    console.error('[CPB] Could not save projects.', err);
    return false;
  }
}
