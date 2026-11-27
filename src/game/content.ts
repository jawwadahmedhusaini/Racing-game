export interface CarSpec {
  id: string; name: string; maker: string; class: string; tagline: string;
  color: string; topSpeed: number; acceleration: number; handling: number;
  nitro: number; price: number; asset?: string; collision?: {halfWidth:number;halfLength:number}; exhaust?: [number,number,number]; suspension?: {wheelRadius:number;travel:number}; shape: 'wedge' | 'flow' | 'track' | 'grandtourer';
}

// Preview access stays separate from purchases recorded in player saves.
export const OPEN_GARAGE = true;

export const STARTER_CAR_ID = 'orion-r';

export const CARS: CarSpec[] = [
  { id: 'vanta', name: 'VANTA GT', maker: 'AUREL', class: 'A', tagline: 'Precision, without compromise.', color: '#ff552b', topSpeed: 322, acceleration: 88, handling: 91, nitro: 82, price: 1800, shape: 'wedge' },
  { id: 'spectre', name: 'SPECTRE S', maker: 'NOVARA', class: 'S', tagline: 'A long nose. A low horizon.', color: '#b8dce0', topSpeed: 356, acceleration: 93, handling: 83, nitro: 94, price: 6000, shape: 'flow' },
  { id: 'stratos', name: 'STRATOS R', maker: 'KAIROS', class: 'S', tagline: 'Wide stance. Built for the apex.', color: '#e7f069', topSpeed: 338, acceleration: 96, handling: 98, nitro: 88, price: 10000, shape: 'track' },
  { id: 'solstice', name: 'SOLSTICE GT', maker: 'VELORA', class: 'A', tagline: 'Long bonnet. Open horizon.', color: '#287c86', topSpeed: 328, acceleration: 90, handling: 94, nitro: 87, price: 2500, shape: 'grandtourer' },
  { id: 'bmw-m3', name: 'M3 GTR', maker: 'BMW', class: 'A', tagline: 'A community-built touring racer. V8 character.', color: '#a8bdce', topSpeed: 312, acceleration: 87, handling: 96, nitro: 85, price: 2200, shape: 'grandtourer' },
  { id: 'lf-gt', name: 'LF GT', maker: 'MASTERLIFE', class: 'S', tagline: 'Sculpted bodywork. A soaring V12 voice.', color: '#d93424', topSpeed: 348, acceleration: 94, handling: 88, nitro: 92, price: 4500, shape: 'grandtourer', asset: 'lf-gt', collision: {halfWidth:1.1,halfLength:2.6}, exhaust: [.55,.29,-2.12] },
  { id: STARTER_CAR_ID, name: 'ORION R', maker: 'AUREL', class: 'S',
    tagline: 'Low canopy, sculpted haunches and a high-revving V12.', color: '#d8b27d',
    topSpeed: 350, acceleration: 93, handling: 96, nitro: 90, price: 0, shape: 'grandtourer',
    asset: 'orion-r', collision: {halfWidth:1.14,halfLength:2.58}, exhaust: [.29,.355,-2.52],
    suspension: {wheelRadius:.38,travel:.062} },
  { id: 'cavallo-575', name: '575 GTC', maker: 'CAVALLO', class: 'A',
    tagline: 'A front-engined V12 endurance racer.', color: '#b4172c',
    topSpeed: 324, acceleration: 89, handling: 94, nitro: 86, price: 3800,
    shape: 'grandtourer', asset: 'cavallo-575', collision: {halfWidth:1.04,halfLength:2.44},
    exhaust: [.93,.148,-.49], suspension: {wheelRadius:.337,travel:.045} },
];

export const PAINTS = ['#ff552b', '#b8dce0', '#e7f069', '#f2f1eb', '#7672e8', '#263645'];
export type TrackId = 'coast' | 'city';
export type RaceMode = 'quick' | 'career' | 'time' | 'elimination';
export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export type Difficulty = 'rookie' | 'pro' | 'expert';

export const TRACKS = [
  { id: 'coast' as TrackId, name: 'COSTA AURELIA', subtitle: 'THE COASTAL RUN', region: 'ITALIAN RIVIERA', weather: 'GOLDEN HOUR', description: 'Cliffside sweepers. Ocean air. One more corner.', laps: 2 },
  { id: 'city' as TrackId, name: 'NEON HARBOR', subtitle: 'THE BREAKWATER RUN', region: 'PACIFIC METROPOLIS', weather: 'BLUE HOUR', description: 'Dockside launch, freight chicane and the elevated waterfront.', laps: 2 },
];

export const EVENTS = [
  { name: 'First light', track: 'coast' as TrackId, mode: 'career' as RaceMode, target: 5, reward: 1500, text: 'Finish in the top five.' },
  { name: 'Midnight club', track: 'city' as TrackId, mode: 'career' as RaceMode, target: 4, reward: 2000, text: 'Finish in the top four.' },
  { name: 'Chasing gold', track: 'coast' as TrackId, mode: 'career' as RaceMode, target: 3, reward: 2500, text: 'Reach the podium.' },
  { name: 'City champion', track: 'city' as TrackId, mode: 'career' as RaceMode, target: 1, reward: 4000, text: 'Take the win.' },
];
