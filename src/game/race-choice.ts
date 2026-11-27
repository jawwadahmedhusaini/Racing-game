import type {RaceMode, TrackId} from './content';

export type RaceChoice = {track: TrackId; mode: Exclude<RaceMode,'career'>};
const key = 'apex-rush-last-race';
export const featuredRace: RaceChoice = {track:'city', mode:'quick'};

export function readRaceChoice(): RaceChoice | null {
  try {
    const choice = JSON.parse(localStorage.getItem(key) ?? 'null');
    if ((choice?.track === 'coast' || choice?.track === 'city') &&
        ['quick','time','elimination'].includes(choice.mode)) return choice;
  } catch {
    // Private browsing or cleared storage should still allow a first race.
  }
  return null;
}

export function rememberRaceChoice(choice: RaceChoice) {
  try { localStorage.setItem(key, JSON.stringify(choice)); } catch { /* Optional preference. */ }
}
