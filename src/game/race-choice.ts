import {HARBOR_SPRINT,canRaceModeOnTrack,type RaceMode,type TrackId} from './content';

export type RaceChoice = {track: TrackId; mode: Exclude<RaceMode,'career'>};
const key = 'apex-rush-last-race';
export const featuredRace: RaceChoice = {track:HARBOR_SPRINT.track,mode:HARBOR_SPRINT.mode};

function isRaceChoice(value: unknown): value is RaceChoice {
  if (!value || typeof value !== 'object') return false;
  const {track,mode} = value as Partial<RaceChoice>;
  return (track === 'coast' || track === 'city') &&
    (mode === 'quick' || mode === 'time' || mode === 'elimination' || mode === 'sprint') &&
    canRaceModeOnTrack(mode, track);
}

export function readRaceChoice(): RaceChoice | null {
  try {
    const choice = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (isRaceChoice(choice)) return {track:choice.track,mode:choice.mode};
  } catch {
    // Private browsing or cleared storage should still allow a first race.
  }
  return null;
}

export function rememberRaceChoice(choice: RaceChoice) {
  if (!isRaceChoice(choice)) return;
  try { localStorage.setItem(key, JSON.stringify(choice)); } catch { /* Optional preference. */ }
}
