import { setWithExpiry, getWithExpiry } from './storageWithExpiry';

export const INTRO_COMPLETED_STORAGE_KEY = 'pi:intro:completed';
export const INTRO_REPLAY_EVENT = 'pi:intro:replay';

export function markIntroCompleted() {
  //setWithExpiry(INTRO_COMPLETED_STORAGE_KEY, true, 1/60); // 1 minute
  setWithExpiry(INTRO_COMPLETED_STORAGE_KEY, true, 24); // 24 hours

}

export function isIntroCompleted(): boolean {
  const value = getWithExpiry<boolean>(INTRO_COMPLETED_STORAGE_KEY);
  return value === true;
}

export function requestIntroReplay() {
  window.dispatchEvent(new Event(INTRO_REPLAY_EVENT));
}
