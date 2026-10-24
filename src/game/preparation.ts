/** Cancel the wait even when the graphics driver has not finished compiling. */
export function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
  return new Promise<T>((resolve,reject)=>{
    const cancel=()=>reject(new DOMException('Race preparation cancelled','AbortError'));
    if(signal.aborted){promise.catch(()=>{});cancel();return;}
    signal.addEventListener('abort',cancel,{once:true});
    promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',cancel));
  });
}
