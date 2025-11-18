export type Stats = {
  users: number;
  aum: number; // in dollars
  uptime?: number;
  support?: string;
};

const STORAGE_KEY = 'landing:stats:v1';
const START_KEY = 'landing:stats:start:v1';

const DEFAULTS: Stats = {
  users: 35,
  aum: 100000,
  uptime: 99.9,
  support: '24/7',
};

function load(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) } as Stats;
  } catch (e) {
    console.warn('stats: failed to load', e);
    return { ...DEFAULTS };
  }
}

function save(s: Stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(
      new CustomEvent('landing:stats:update', { detail: s })
    );
  } catch (e) {
    console.warn('stats: failed to save', e);
  }
}

export function getStats(): Stats {
  return load();
}

export function setStats(partial: Partial<Stats>) {
  const cur = load();
  const merged = { ...cur, ...partial };
  save(merged);
}

export function getStartStats(): Partial<Stats> | null {
  try {
    const raw = localStorage.getItem(START_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<Stats>;
  } catch (e) {
    return null;
  }
}

export function setStartStats(s: Partial<Stats>) {
  try {
    localStorage.setItem(START_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('stats: failed to save start stats', e);
  }
}

export function incrementUsers(delta = 1) {
  const s = load();
  s.users = Math.max(0, Math.floor(s.users + delta));
  save(s);
}

export function addAUM(amount = 0) {
  const s = load();
  s.aum = Math.max(0, Math.floor(s.aum + amount));
  save(s);
}

export function subscribe(cb: (s: Stats) => void) {
  const handler = (e: Event) => {
    const detail = e?.detail as Stats | undefined;
    if (detail) cb(detail);
  };
  window.addEventListener('landing:stats:update', handler as EventListener);
  return () =>
    window.removeEventListener(
      'landing:stats:update',
      handler as EventListener
    );
}

export default {
  getStats,
  setStats,
  getStartStats,
  setStartStats,
  incrementUsers,
  addAUM,
  subscribe,
};
