import {it,expect,vi} from 'vitest';
import {AssetCache} from '../src/game/asset-cache';

it('shares concurrent requests and retries a failed download',async()=>{
  const loader=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({id:1}),cache=new AssetCache(loader,vi.fn());
  const a=cache.load('car'),b=cache.load('car');expect(a).toBe(b);
  await expect(a).rejects.toThrow('offline');expect(cache.stats()).toEqual([]);
  await cache.load('car');expect(loader).toHaveBeenCalledTimes(2);expect(cache.acquire('car').value).toEqual({id:1});
});
it('evicts idle assets in least-recently-used order without disposing live instances',async()=>{
  const dispose=vi.fn(),cache=new AssetCache(async key=>({key}),dispose);
  await cache.load('active');const a=cache.acquire('active'),b=cache.acquire('active');
  await cache.load('old');await cache.load('recent');cache.trim(1);
  expect(dispose.mock.calls.map(c=>c[0].key)).toEqual(['old']);a.release();a.release();cache.trim(0);
  expect(cache.stats()).toEqual([{key:'active',ready:true,users:1}]);
  b.release();cache.trim(0);expect(cache.stats()).toEqual([]);expect(dispose.mock.calls.filter(c=>c[0].key==='active')).toHaveLength(1);
});
it('keeps in-flight requests and explicit race detail levels when trimming',async()=>{
  let resolve!:(v:{key:string})=>void;
  const cache=new AssetCache(key=>key==='pending'?new Promise(r=>resolve=r):Promise.resolve({key}),vi.fn());
  const pending=cache.load('pending');await cache.load('player-lod');await cache.load('unused');cache.trim(0,['player-lod']);
  expect(cache.stats().map(e=>e.key)).toEqual(['pending','player-lod']);resolve({key:'pending'});await pending;
  expect(cache.acquire('pending').value.key).toBe('pending');
});
