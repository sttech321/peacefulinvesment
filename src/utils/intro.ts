export const INTRO_COMPLETED_STORAGE_KEY = 'pi:intro:completed';
export const INTRO_REPLAY_EVENT = 'pi:intro:replay';

export function markIntroCompleted() {
  try {
    window.localStorage.setItem(INTRO_COMPLETED_STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

export function isIntroCompleted(): boolean {
  try {
    return window.localStorage.getItem(INTRO_COMPLETED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function requestIntroReplay() {
  window.dispatchEvent(new Event(INTRO_REPLAY_EVENT));
}
