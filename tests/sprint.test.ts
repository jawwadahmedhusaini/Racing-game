import {afterEach,expect,it,vi} from 'vitest';
import {CARS,HARBOR_SPRINT} from '../src/game/content';
import {featuredRace,readRaceChoice,rememberRaceChoice} from '../src/game/race-choice';
import {NO_INPUT,RaceSimulation} from '../src/game/simulation';
import {freshSave,parseSave} from '../src/game/storage';
import {Track} from '../src/game/track';

const car=CARS.find(car=>car.id==='bmw-m3')!;
const track=new Track(HARBOR_SPRINT.track);
const sprint=()=>new RaceSimulation({track,car,mode:'sprint',difficulty:'pro',upgrade:0});
afterEach(()=>vi.unstubAllGlobals());

it('opens Neon Harbor with a one-lap sprint grid for seven drivers',()=>{
  expect(featuredRace).toEqual({track:'city',mode:'sprint'});
  const sim=sprint();
  expect(sim.laps).toBe(1);
  expect(sim.drivers).toHaveLength(7);
  expect(sim.drivers.map(driver=>Math.abs(driver.distance))).toEqual([0,0,7,7,14,14,21]);
  expect(new RaceSimulation({track,car,mode:'quick',difficulty:'pro',upgrade:0}).laps).toBe(2);
  expect(()=>new RaceSimulation({track:new Track('coast'),car,mode:'sprint',difficulty:'pro',upgrade:0})).toThrow(/Neon Harbor/);
});

it('finishes on the first forward crossing with the same split and result time',()=>{
  const sim=sprint();
  sim.status='racing';
  sim.elapsed=70;
  Object.assign(sim.player,{distance:track.length-.2,lateral:0,speed:42});
  sim.step(1/60,NO_INPUT);
  expect(sim.status).toBe('finished');
  expect(sim.player.finishTime).toBeGreaterThan(70);
  expect(sim.player.finishTime).toBeLessThan(70+1/60);
  expect(sim.bestLap).toBe(sim.player.finishTime);
  expect(sim.resultPosition).toBe(1);
  sim.step(.2,NO_INPUT);
  expect(sim.bestLap).toBe(sim.player.finishTime);
});

it('can recover close to the sprint finish without advancing the result',()=>{
  const sim=sprint();
  sim.status='racing';
  Object.assign(sim.player,{distance:track.length-.6,lateral:5,speed:19,heading:.8});
  sim.recover();
  expect(sim.player.distance).toBe(track.length-.6);
  expect(sim.player.lateral).toBe(0);
  expect(sim.player.finishTime).toBeNull();
  expect(sim.bestLap).toBeNull();
  sim.step(1/120,{...NO_INPUT,brake:1});
  expect(sim.status).toBe('racing');
});

it('preserves the valid sprint personal best beside the existing results',()=>{
  const existing=freshSave();
  const parsed=parseSave(JSON.stringify({...existing,bestTimes:{
    'city-v8-quick':155,
    'city-v8-sprint':75,
    'coast-v7-time':78,
    'coast-v7-sprint':73,
    'city-v7-sprint':60,
  }}));
  expect(parsed.bestTimes).toEqual({'city-v8-quick':155,'city-v8-sprint':75,'coast-v7-time':78});
});

it('remembers a sprint while preserving existing choices and rejecting a coast sprint',()=>{
  let stored:string|null=null;
  vi.stubGlobal('localStorage',{
    getItem:()=>stored,
    setItem:(_key:string,value:string)=>{stored=value;},
  });
  expect(readRaceChoice()).toBeNull();
  rememberRaceChoice(featuredRace);
  expect(readRaceChoice()).toEqual(featuredRace);
  rememberRaceChoice({track:'coast',mode:'sprint'});
  expect(readRaceChoice()).toEqual(featuredRace);
  rememberRaceChoice({track:'coast',mode:'time'});
  expect(readRaceChoice()).toEqual({track:'coast',mode:'time'});
  stored=JSON.stringify({track:'coast',mode:'sprint'});
  expect(readRaceChoice()).toBeNull();
});

it('sets a reachable sprint pace across all six rivals and all difficulties',()=>{
  const meanTimes:number[]=[];
  for(const difficulty of ['rookie','pro','expert'] as const){
    const sim=new RaceSimulation({track,car,mode:'sprint',difficulty,upgrade:0});
    for(let i=0;i<100*60;i++) sim.step(1/60,NO_INPUT);
    const times=sim.drivers.slice(1).map(driver=>driver.finishTime);
    expect(new Set(times).size).toBe(6);
    const perDifficultyMinimum=difficulty==='expert'?52:60;
    expect(times.every(time=>time!==null&&time>=perDifficultyMinimum&&time<=90)).toBe(true);
    expect(sim.player.finishTime).toBeNull();
    expect(sim.player.distance).toBeLessThan(track.length*.02);
    meanTimes.push(times.reduce<number>((total,time)=>total+time!,0)/times.length);
  }
  expect(meanTimes[0]).toBeGreaterThan(meanTimes[1]);
  expect(meanTimes[1]).toBeGreaterThan(meanTimes[2]);
},15_000);

it('runs the full BMW sprint without teleporting, finishing with a valid placing',()=>{
  const sim=new RaceSimulation({track,car,mode:'sprint',difficulty:'rookie',upgrade:0});
  for(let i=0;i<95*60&&sim.status!=='finished';i++) sim.step(1/60,sim.aiInput(sim.player));
  expect(sim.status).toBe('finished');
  expect(sim.player.finishTime).toBeGreaterThanOrEqual(60);
  expect(sim.player.finishTime).toBeLessThanOrEqual(90);
  expect(sim.bestLap).toBe(sim.player.finishTime);
  expect(sim.resultPosition).toBeGreaterThanOrEqual(1);
  expect(sim.resultPosition).toBeLessThanOrEqual(7);
},15_000);
