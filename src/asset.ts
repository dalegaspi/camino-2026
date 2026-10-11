// Resolve a repo-relative asset path (e.g. "photos/thumb/x.jpg") against
// Vite's configured base URL, so it works both at local dev root ("/") and
// at the GitHub Pages project-page subpath ("/camino-2026/").
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL; // e.g. "/" or "/camino-2026/"
  return base.endsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
