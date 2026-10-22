import { defineConfig } from 'vite';
export default defineConfig({server:{host:'0.0.0.0',port:5173},build:{target:'es2022',chunkSizeWarningLimit:1000,rollupOptions:{output:{manualChunks:(id:string)=>id.includes('/three/')?'three':undefined}}}});
