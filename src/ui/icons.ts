const paths:Record<string,string>={
 arrow:'<path d="M4 12h16M13 5l7 7-7 7"/>',back:'<path d="M20 12H4m7-7-7 7 7 7"/>',chevron:'<path d="m9 5 7 7-7 7"/>',
 gear:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
 flag:'<path d="M5 21V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
 sound:'<path d="m11 4-6 5H2v6h3l6 5Zm4 4a7 7 0 0 1 0 8m3-12a12 12 0 0 1 0 16"/>',
 pause:'<path d="M8 4v16M16 4v16" stroke-width="4"/>',
 play:'<path d="m8 4 12 8-12 8Z"/>',
 trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v6m-5 1h10"/>',
 star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
 check:'<path d="m5 12 4 4L20 5"/>',
 close:'<path d="m5 5 14 14M19 5 5 19"/>',
 reset:'<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
 moon:'<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
 expand:'<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
 key:'<path d="M3 6h18v12H3Zm3 3h1m3 0h1m3 0h1m3 0h1M6 12h1m3 0h1m3 0h1m-9 3h12"/>',
};
export function icon(name:string,size=20){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.arrow}</svg>`;}
export const logo='<svg viewBox="0 0 42 38" fill="none" aria-hidden="true"><path d="M2 33 20 3h10L14 29h24l-3 4Z" fill="currentColor"/><path d="m29 9 11 20H26l4-7-5-8Z" fill="currentColor"/></svg>';
