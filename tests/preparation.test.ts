import {it,expect} from 'vitest';
import {abortable} from '../src/game/preparation';
it('cancels while graphics compilation is still pending',async()=>{const controller=new AbortController();const pending=abortable(new Promise(()=>{}),controller.signal);controller.abort();await expect(pending).rejects.toMatchObject({name:'AbortError'});});
it('propagates a graphics failure and handles already cancelled work',async()=>{const controller=new AbortController();await expect(abortable(Promise.reject(new Error('Graphics failed')),controller.signal)).rejects.toThrow('Graphics failed');controller.abort();await expect(abortable(Promise.resolve(1),controller.signal)).rejects.toMatchObject({name:'AbortError'});});
it('completed compilation cannot be cancelled retroactively',async()=>{const controller=new AbortController();const pending=abortable(Promise.resolve(42),controller.signal);expect(await pending).toBe(42);controller.abort();expect(await pending).toBe(42);});
