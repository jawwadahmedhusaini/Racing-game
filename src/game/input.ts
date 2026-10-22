import type {Controls} from './simulation';
export class InputSystem {
  keys=new Set<string>();touch=new Set<string>();autoAccelerate=false;
  onPause=()=>{};onCamera=()=>{};onRecover=()=>{};
  constructor(){
    window.addEventListener('keydown',e=>{if((e.target as HTMLElement)?.matches('input,select,textarea'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();if(e.repeat)return;this.keys.add(e.code);if(e.code==='Escape')this.onPause();if(e.code==='KeyC')this.onCamera();if(e.code==='KeyR')this.onRecover();});
    window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clear());
    document.addEventListener('pointerdown',e=>{const el=(e.target as HTMLElement).closest<HTMLElement>('[data-hold]');if(!el)return;e.preventDefault();el.setPointerCapture(e.pointerId);this.touch.add(el.dataset.hold!);el.classList.add('pressed');});
    const release=(e:PointerEvent)=>{const el=(e.target as HTMLElement).closest<HTMLElement>('[data-hold]');if(el){this.touch.delete(el.dataset.hold!);el.classList.remove('pressed');}};
    document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);document.addEventListener('lostpointercapture',release);
  }
  clear(){this.keys.clear();this.touch.clear();document.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));}
  read():Controls {
    const yes=(action:string,...codes:string[])=>this.touch.has(action)||codes.some(k=>this.keys.has(k));
    return {throttle:yes('throttle','KeyW','ArrowUp')||this.autoAccelerate?1:0,brake:yes('brake','KeyS','ArrowDown')?1:0,steer:(yes('right','KeyD','ArrowRight')?1:0)-(yes('left','KeyA','ArrowLeft')?1:0),drift:yes('drift','Space'),nitro:yes('nitro','ShiftLeft','ShiftRight')};
  }
}
