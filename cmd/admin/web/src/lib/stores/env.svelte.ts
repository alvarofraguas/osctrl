const STORAGE_KEY = 'osctrl.selectedEnv';

function loadInitial(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

let _env = $state<string | null>(loadInitial());

export function getSelectedEnv(): string | null {
  return _env;
}

export function setSelectedEnv(name: string | null) {
  _env = name;
  if (typeof localStorage !== 'undefined') {
    if (name === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, name);
  }
}
