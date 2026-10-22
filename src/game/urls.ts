/** Keep bundled assets under Vite's hosting base, including GitHub project sites. */
export function publicUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
