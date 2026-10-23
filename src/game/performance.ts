// Wall-clock frame sampling, independent of the simulation's capped timestep.
// Resolution can reduce GPU fill cost; it cannot cure a CPU-bound scene.
export class ResolutionGovernor {
  scale=1;enabled=true;private elapsed=0;private frames=0;private settle=3;private fastWindows=0;
  reset(){this.scale=1;this.elapsed=0;this.frames=0;this.settle=3;this.fastWindows=0;}
  sample(seconds:number,active=true){
    if(!this.enabled||!active||!Number.isFinite(seconds)||seconds<=0||seconds>10){this.elapsed=0;this.frames=0;return false;}
    if(this.settle>0){this.settle-=seconds;return false;}
    this.elapsed+=seconds;this.frames++;
    if(this.elapsed<2)return false;
    const ms=this.elapsed*1000/this.frames;this.elapsed=0;this.frames=0;const before=this.scale;
    if(ms>24){this.scale=Math.max(.55,Math.round((this.scale-.1)*100)/100);this.fastWindows=0;}
    else if(ms<17){if(++this.fastWindows>=4){this.scale=Math.min(1,Math.round((this.scale+.05)*100)/100);this.fastWindows=0;}}
    else this.fastWindows=0;
    if(before!==this.scale)this.settle=3;
    return before!==this.scale;
  }
}
