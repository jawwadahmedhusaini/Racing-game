import {CARS,type Quality,type Difficulty} from './content';
export interface SaveData {version:1;credits:number;owned:string[];selected:string;paints:Record<string,string>;upgrades:Record<string,number>;career:number;stars:number;races:number;wins:number;bestTimes:Record<string,number>;settings:{quality:Quality;difficulty:Difficulty;music:number;engine:number;effects:number;autoAccelerate:boolean;adaptiveResolution:boolean;showPerformance:boolean;reducedMotion:boolean;};}
export const SAVE_KEY='apex-rush-save-v1';
const KEY=SAVE_KEY;let loadedRaw:string|null=null;
export const freshSave=():SaveData=>({version:1,credits:2500,owned:['vanta'],selected:'vanta',paints:{},upgrades:{},career:0,stars:0,races:0,wins:0,bestTimes:{},settings:{quality:'high',difficulty:'rookie',music:.15,engine:.5,effects:.55,autoAccelerate:false,adaptiveResolution:true,showPerformance:false,reducedMotion:false}});
export function parseSave(raw:string|null):SaveData {
  const base=freshSave();if(!raw)return base;
  try {
    const data=JSON.parse(raw);if(!data||data.version!==1)return base;
    for(const key of ['credits','career','stars','races','wins'] as const)if(Number.isFinite(data[key])&&data[key]>=0)base[key]=Math.floor(Math.min(data[key],key==='career'?4:1e8));
    base.owned=Array.isArray(data.owned)?CARS.filter(c=>c.price===0||data.owned.includes(c.id)).map(c=>c.id):base.owned;
    if(base.owned.includes(data.selected))base.selected=data.selected;
    for(const car of CARS){const paint=data.paints?.[car.id];if(typeof paint==='string'&&/^#[0-9a-f]{6}$/i.test(paint))base.paints[car.id]=paint;const up=data.upgrades?.[car.id];if(Number.isInteger(up)&&up>=0&&up<=3)base.upgrades[car.id]=up;}
    if(data.bestTimes&&typeof data.bestTimes==='object')for(const [key,value] of Object.entries(data.bestTimes))if(/^(coast|city)-(v[23]-)?(time|quick|career|elimination)$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0)base.bestTimes[key]=value;
    const settings=data.settings??{};
    if(['low','medium','high','ultra'].includes(settings.quality))base.settings.quality=settings.quality;
    if(['rookie','pro','expert'].includes(settings.difficulty))base.settings.difficulty=settings.difficulty;
    for(const k of ['music','engine','effects'] as const)if(Number.isFinite(settings[k]))base.settings[k]=Math.max(0,Math.min(1,settings[k]));
    for(const k of ['autoAccelerate','adaptiveResolution','showPerformance','reducedMotion'] as const)if(typeof settings[k]==='boolean')base.settings[k]=settings[k];
    return base;
  }catch{return base;}
}
export function loadSave(){try{loadedRaw=localStorage.getItem(KEY);return parseSave(loadedRaw);}catch{return freshSave();}}
export function saveProgress(data:SaveData){try{if(localStorage.getItem(KEY)!==loadedRaw)return 'conflict' as const;const raw=JSON.stringify(data);localStorage.setItem(KEY,raw);loadedRaw=raw;return 'saved' as const;}catch{return 'unavailable' as const;}}
export function buyCar(data:SaveData,id:string){const car=CARS.find(c=>c.id===id);if(!car||data.owned.includes(id)||data.credits<car.price)return false;data.credits-=car.price;data.owned.push(id);data.selected=id;return true;}
export function upgradeCar(data:SaveData,id:string){const level=data.upgrades[id]??0,cost=(level+1)*1800;if(!data.owned.includes(id)||level>=3||data.credits<cost)return false;data.credits-=cost;data.upgrades[id]=level+1;return true;}
