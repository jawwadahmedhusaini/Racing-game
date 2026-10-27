/** Shared requests, retryable failures and LRU eviction of unreferenced assets.
 * Trimming is explicit: callers finish acquiring their batch before evicting.
 */
export class AssetCache<T> {
  private entries=new Map<string,{promise:Promise<T>;value?:T;users:number;used:number}>();
  private clock=0;
  constructor(private loader:(key:string)=>Promise<T>,private dispose:(value:T)=>void){}
  load(key:string):Promise<T>{
    const existing=this.entries.get(key);if(existing){existing.used=++this.clock;return existing.promise;}
    const entry={promise:undefined as unknown as Promise<T>,value:undefined as T|undefined,users:0,used:++this.clock};
    entry.promise=Promise.resolve().then(()=>this.loader(key)).then(value=>{entry.value=value;return value;},error=>{this.entries.delete(key);throw error;});
    this.entries.set(key,entry);return entry.promise;
  }
  acquire(key:string){
    const entry=this.entries.get(key);if(!entry?.value)throw new Error(`Asset is not ready: ${key}`);
    entry.users++;entry.used=++this.clock;let released=false;
    return {value:entry.value,release:()=>{if(!released){released=true;entry.users--;entry.used=++this.clock;}}};
  }
  trim(maxIdle=2,keep:string[]=[]){
    const idle=[...this.entries].filter(([key,e])=>e.value&&e.users===0&&!keep.includes(key)).sort((a,b)=>b[1].used-a[1].used);
    for(const [key,e] of idle.slice(maxIdle)){this.entries.delete(key);this.dispose(e.value!);}
  }
  stats(){return [...this.entries].map(([key,e])=>({key,ready:!!e.value,users:e.users}));}
}
