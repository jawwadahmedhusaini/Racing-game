import {CARS,STARTER_CAR_ID,type Quality,type Difficulty} from './content';
export interface SaveData {version:1;credits:number;owned:string[];selected:string;paints:Record<string,string>;upgrades:Record<string,number>;career:number;stars:number;races:number;wins:number;bestTimes:Record<string,number>;settings:{quality:Quality;difficulty:Difficulty;music:number;engine:number;effects:number;autoAccelerate:boolean;adaptiveResolution:boolean;showPerformance:boolean;reducedMotion:boolean;};}
export const SAVE_KEY='apex-rush-save-v1';
const KEY=SAVE_KEY;let loadedRaw:string|null=null;
export const freshSave=():SaveData=>({version:1,credits:2500,owned:[STARTER_CAR_ID],selected:STARTER_CAR_ID,paints:{},upgrades:{},career:0,stars:0,races:0,wins:0,bestTimes:{},settings:{quality:'high',difficulty:'rookie',music:.15,engine:.5,effects:.55,autoAccelerate:false,adaptiveResolution:true,showPerformance:false,reducedMotion:false}});
export function parseSave(raw:string|null,openGarage=false):SaveData {
  const base=freshSave();if(!raw)return base;
  try {
    const data=JSON.parse(raw);if(!data||data.version!==1)return base;
    for(const key of ['credits','career','stars','races','wins'] as const)if(Number.isFinite(data[key])&&data[key]>=0)base[key]=Math.floor(Math.min(data[key],key==='career'?4:1e8));
    const owned:unknown[]=Array.isArray(data.owned)?data.owned:[];
    const legacy=!owned.includes(STARTER_CAR_ID);
    const valid=new Set(CARS.map(car=>car.id));
    // Old saves always owned the free Vanta, even when ownership was left implicit.
    base.owned=[...new Set([...(legacy?['vanta']:[]),...owned.filter((id):id is string=>typeof id==='string'&&valid.has(id)),STARTER_CAR_ID])];
    base.selected=canDriveCar(base,data.selected,openGarage)?data.selected:legacy?'vanta':STARTER_CAR_ID;
    for(const car of CARS){const paint=data.paints?.[car.id];if(typeof paint==='string'&&/^#[0-9a-f]{6}$/i.test(paint))base.paints[car.id]=paint;const up=data.upgrades?.[car.id];if(Number.isInteger(up)&&up>=0&&up<=3)base.upgrades[car.id]=up;}
    if(data.bestTimes&&typeof data.bestTimes==='object')for(const [key,value] of Object.entries(data.bestTimes))if(/^(coast|city)-(v[2345678]-)?(time|quick|career|elimination)$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0)base.bestTimes[key]=value;
    const settings=data.settings??{};
    if(['low','medium','high','ultra'].includes(settings.quality))base.settings.quality=settings.quality;
    if(['rookie','pro','expert'].includes(settings.difficulty))base.settings.difficulty=settings.difficulty;
    for(const k of ['music','engine','effects'] as const)if(Number.isFinite(settings[k]))base.settings[k]=Math.max(0,Math.min(1,settings[k]));
    for(const k of ['autoAccelerate','adaptiveResolution','showPerformance','reducedMotion'] as const)if(typeof settings[k]==='boolean')base.settings[k]=settings[k];
    return base;
  }catch{return base;}
}
export function canDriveCar(data:SaveData,id:string,openGarage=false){
  return CARS.some(car=>car.id===id)&&(openGarage||data.owned.includes(id));
}
export function loadSave(openGarage=false){try{loadedRaw=localStorage.getItem(KEY);return parseSave(loadedRaw,openGarage);}catch{return freshSave();}}
export function saveProgress(data:SaveData){try{if(localStorage.getItem(KEY)!==loadedRaw)return 'conflict' as const;const raw=JSON.stringify(data);localStorage.setItem(KEY,raw);loadedRaw=raw;return 'saved' as const;}catch{return 'unavailable' as const;}}
export function buyCar(data:SaveData,id:string){const car=CARS.find(c=>c.id===id);if(!car||data.owned.includes(id)||data.credits<car.price)return false;data.credits-=car.price;data.owned.push(id);data.selected=id;return true;}
export function upgradeCar(data:SaveData,id:string,openGarage=false){const level=data.upgrades[id]??0,cost=(level+1)*1800;if(!canDriveCar(data,id,openGarage)||level>=3||data.credits<cost)return false;data.credits-=cost;data.upgrades[id]=level+1;return true;}
