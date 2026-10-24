import type {Track} from './track';

export interface SceneryFootprint {kind:string;x:number;z:number;radius:number;}
/** Whole-circuit horizontal exclusion zone, including nearby sections of the same road. */
export class RoadSpace {
  readonly placements:SceneryFootprint[]=[];
  private cells=new Map<string,number[]>();
  private cellSize=32;
  constructor(readonly track:Track){
    for(let i=0;i<track.count;i++){
      const a=track.samples[i].position,b=track.samples[(i+1)%track.count].position;
      for(let x=Math.floor(Math.min(a.x,b.x)/32);x<=Math.floor(Math.max(a.x,b.x)/32);x++)for(let z=Math.floor(Math.min(a.z,b.z)/32);z<=Math.floor(Math.max(a.z,b.z)/32);z++){
        const key=`${x},${z}`,items=this.cells.get(key)??[];items.push(i);this.cells.set(key,items);
      }
    }
  }
  clear(x:number,z:number,radius:number){
    // Two metres beyond the road edge also protect barriers and provide visual breathing room.
    const extent=this.track.width/2+2+radius,visited=new Set<number>();
    for(let cx=Math.floor((x-extent)/this.cellSize);cx<=Math.floor((x+extent)/this.cellSize);cx++)for(let cz=Math.floor((z-extent)/this.cellSize);cz<=Math.floor((z+extent)/this.cellSize);cz++){
      for(const i of this.cells.get(`${cx},${cz}`)??[]){
        if(visited.has(i))continue;visited.add(i);
        const a=this.track.samples[i].position,b=this.track.samples[(i+1)%this.track.count].position;
        const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
        if((x-a.x-t*dx)**2+(z-a.z-t*dz)**2<extent*extent)return false;
      }
    }
    return true;
  }
  place(kind:string,x:number,z:number,radius:number){if(!this.clear(x,z,radius))return false;this.placements.push({kind,x,z,radius});return true;}
}
