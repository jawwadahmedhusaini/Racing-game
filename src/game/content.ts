export interface CarSpec {
  id: string; name: string; maker: string; class: string; tagline: string;
  color: string; topSpeed: number; acceleration: number; handling: number;
  nitro: number; price: number; shape: 'wedge' | 'flow' | 'track' | 'grandtourer';
}

export const CARS: CarSpec[] = [
  { id: 'vanta', name: 'VANTA GT', maker: 'AUREL', class: 'A', tagline: 'Precision, without compromise.', color: '#ff552b', topSpeed: 322, acceleration: 88, handling: 91, nitro: 82, price: 0, shape: 'wedge' },
  { id: 'spectre', name: 'SPECTRE S', maker: 'NOVARA', class: 'S', tagline: 'A long nose. A low horizon.', color: '#b8dce0', topSpeed: 356, acceleration: 93, handling: 83, nitro: 94, price: 6000, shape: 'flow' },
  { id: 'stratos', name: 'STRATOS R', maker: 'KAIROS', class: 'S', tagline: 'Wide stance. Built for the apex.', color: '#e7f069', topSpeed: 338, acceleration: 96, handling: 98, nitro: 88, price: 10000, shape: 'track' },
  { id: 'solstice', name: 'SOLSTICE GT', maker: 'VELORA', class: 'A', tagline: 'Long bonnet. Open horizon.', color: '#287c86', topSpeed: 328, acceleration: 90, handling: 94, nitro: 87, price: 2500, shape: 'grandtourer' },
];

export const PAINTS = ['#ff552b', '#b8dce0', '#e7f069', '#f2f1eb', '#7672e8', '#263645'];
export type TrackId = 'coast' | 'city';
export type RaceMode = 'quick' | 'career' | 'time' | 'elimination';
export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export type Difficulty = 'rookie' | 'pro' | 'expert';

export const TRACKS = [
  { id: 'coast' as TrackId, name: 'COSTA AURELIA', subtitle: 'THE COASTAL RUN', region: 'ITALIAN RIVIERA', weather: 'GOLDEN HOUR', description: 'Cliffside sweepers. Ocean air. One more corner.', laps: 2 },
  { id: 'city' as TrackId, name: 'NEON HARBOR', subtitle: 'AFTER HOURS', region: 'PACIFIC METROPOLIS', weather: 'MIDNIGHT', description: 'Light up the waterfront. Own the night.', laps: 2 },
];

export const EVENTS = [
  { name: 'First light', track: 'coast' as TrackId, mode: 'career' as RaceMode, target: 5, reward: 1500, text: 'Finish in the top five.' },
  { name: 'Midnight club', track: 'city' as TrackId, mode: 'career' as RaceMode, target: 4, reward: 2000, text: 'Finish in the top four.' },
  { name: 'Chasing gold', track: 'coast' as TrackId, mode: 'career' as RaceMode, target: 3, reward: 2500, text: 'Reach the podium.' },
  { name: 'City champion', track: 'city' as TrackId, mode: 'career' as RaceMode, target: 1, reward: 4000, text: 'Take the win.' },
];
