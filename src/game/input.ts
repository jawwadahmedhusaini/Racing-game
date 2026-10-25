import type {Controls} from './simulation';
export class InputSystem {
  keys=new Set<string>();touch=new Set<string>();autoAccelerate=false;
  pointers=new Map<number,{action:string;element:HTMLElement}>();
  keyboardActions=new Map<string,{action:string;element:HTMLElement}>();
  onPause=()=>{};onCamera=()=>{};onRecover=()=>{};
  constructor(){
    window.addEventListener('keydown',e=>{
      if(e.code==='Escape'){e.preventDefault();if(!e.repeat)this.onPause();return;}
      const target=e.target instanceof HTMLElement?e.target:null;
      if(e.ctrlKey||e.metaKey||e.altKey||target?.closest('input,select,textarea,[contenteditable="true"]'))return;
      const hold=target?.closest<HTMLElement>('[data-hold]');
      if(hold&&['Space','Enter'].includes(e.code)&&!document.getElementById('modal')){
        e.preventDefault();if(!e.repeat){this.keyboardActions.set(e.code,{action:hold.dataset.hold!,element:hold});this.syncTouch();}return;
      }
      // Keep native Space activation on menu buttons; drift is a gameplay shortcut.
      if(e.code==='Space'&&target?.closest('button,a[href],[role="button"]'))return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
      if(e.repeat)return;this.keys.add(e.code);if(e.code==='KeyC')this.onCamera();if(e.code==='KeyR')this.onRecover();
    });
    window.addEventListener('keyup',e=>{this.keys.delete(e.code);const held=this.keyboardActions.get(e.code);if(held){held.element.classList.remove('pressed');this.keyboardActions.delete(e.code);this.syncTouch();}});window.addEventListener('blur',()=>this.clear());
    document.addEventListener('pointerdown',e=>{const el=(e.target as HTMLElement).closest<HTMLElement>('[data-hold]');if(!el||document.getElementById('modal'))return;e.preventDefault();el.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{action:el.dataset.hold!,element:el});this.syncTouch();});
    const release=(e:PointerEvent)=>{const pointer=this.pointers.get(e.pointerId);if(!pointer)return;this.pointers.delete(e.pointerId);pointer.element.classList.remove('pressed');this.syncTouch();};
    document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);document.addEventListener('lostpointercapture',release);
  }
  syncTouch(){this.touch.clear();for(const {action,element} of [...this.pointers.values(),...this.keyboardActions.values()]){this.touch.add(action);element.classList.add('pressed');}}
  clear(){this.keys.clear();this.keyboardActions.clear();this.touch.clear();const pointers=[...this.pointers];this.pointers.clear();for(const [id,{element}] of pointers)if(element.hasPointerCapture(id))element.releasePointerCapture(id);document.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));}
  read():Controls {
    const yes=(action:string,...codes:string[])=>this.touch.has(action)||codes.some(k=>this.keys.has(k));
    const brake=yes('brake','KeyS','ArrowDown')?1:0;
    return {throttle:!brake&&(yes('throttle','KeyW','ArrowUp')||this.autoAccelerate)?1:0,brake,steer:(yes('right','KeyD','ArrowRight')?1:0)-(yes('left','KeyA','ArrowLeft')?1:0),drift:yes('drift','Space'),nitro:!brake&&yes('nitro','ShiftLeft','ShiftRight')};
  }
}
