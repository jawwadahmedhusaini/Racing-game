import {it,expect} from 'vitest';
import {RaceSimulation} from '../src/game/simulation';
import {contactOffset} from '../src/game/contact';
import {Track} from '../src/game/track';
import {CARS} from '../src/game/content';
const track=new Track('coast');
function pair(){const sim=new RaceSimulation({track,car:CARS[0],mode:'quick',difficulty:'rookie',upgrade:0});return sim.drivers.slice(0,2);}
it('detects contact with a lapped rival and across the start-line seam',()=>{const [a,b]=pair();a.lateral=b.lateral=0;a.distance=track.length-.5;b.distance=.5;expect(contactOffset(a,b,track.length)).not.toBeNull();a.distance=track.length+100;b.distance=101;expect(contactOffset(a,b,track.length)).not.toBeNull();b.distance=120;expect(contactOffset(a,b,track.length)).toBeNull();});
it('handles a sideways car using its full body instead of a lane-sized collision box',()=>{const [a,b]=pair();a.distance=b.distance=100;a.lateral=0;b.lateral=3;a.heading=Math.PI/2;const hit=contactOffset(a,b,track.length);expect(hit).not.toBeNull();a.lateral+=hit!.x;b.lateral-=hit!.x;a.distance+=hit!.z;b.distance-=hit!.z;expect(contactOffset(a,b,track.length)).toBeNull();});
it('does not report separated rotated bodies whose axis-aligned bounds overlap',()=>{const [a,b]=pair();a.heading=b.heading=Math.PI/4;a.distance=b.distance=100;a.lateral=0;b.lateral=3.5;expect(contactOffset(a,b,track.length)).toBeNull();});
