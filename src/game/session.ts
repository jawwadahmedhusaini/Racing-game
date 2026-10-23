// HTTPS and localhost browsers support Web Locks. The fallback save comparison
// still refuses a stale write where that API is unavailable.
export function claimPlaySession():Promise<boolean>{
  if(!navigator.locks)return Promise.resolve(true);
  return new Promise((resolve,reject)=>{
    void navigator.locks.request('apex-rush-play-session',{ifAvailable:true},lock=>{
      resolve(!!lock);if(!lock)return;
      return new Promise<void>(release=>window.addEventListener('pagehide',()=>release(),{once:true}));
    }).catch(reject);
    window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  });
}
