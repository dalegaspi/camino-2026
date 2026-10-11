# Camino Francés · Sarria → Santiago

A single-page interactive map of the last ~115 km of the Camino de Santiago
(Camino Francés, Sarria to Santiago de Compostela), with your own geotagged
photos plotted along the route.

## Map provider: free, no API key

This uses **Leaflet + OpenStreetMap tiles**, not Google Maps. Google Maps JS
API requires a billing-enabled Google Cloud project (credit card on file)
even though personal/low-traffic use normally stays within its $200/mo free
credit — it's "probably free" but not "no account, no risk" free. Leaflet +
OSM tiles have no key, no billing, and no account at all, so that's the
default here. If you still want Google Maps later, swap the tile layer setup
in `src/map.ts` for `google.maps.Map` (the rest of the app — route line,
photo pins, lightbox, sidebar — is provider-agnostic).

## How it works

- `public/route/stage*.gpx` — the six official Xunta de Galicia stages
  (Sarria→Portomarín→Palas de Rei→Melide→Arzúa→O Pedrouzo→Santiago), sourced
  from OpenStreetMap data via trailsplits.com (ODbL).
- `npm run build:route` parses those GPX files into `src/data/route.json`
  (the line drawn on the map, per stage) and `src/data/route-line.json` (a
  flattened point list with cumulative distance, used to project photos onto
  the route).
- `photos/` is where **you** drop your own photos (jpg/jpeg/png with GPS
  EXIF — most phone photos have this by default). This folder is gitignored;
  it's your personal content, not part of the repo.
- `npm run build:photos` reads EXIF GPS + capture date from each photo,
  generates resized `full` (1600px) and `thumb` (320px) JPEGs into
  `public/photos/`, works out how far along the Camino each photo was taken
  (`kmFromSarria`), and writes the manifest `src/data/photos.json` that the
  frontend loads.
- The SPA (Leaflet) draws the route, drops a pin per stage town, and drops a
  thumbnail pin per photo (clustered when zoomed out). Click a pin — or a
  row in the sidebar list — to open a lightbox with the full photo, caption,
  date, and distance along the route.

## Usage

```bash
npm install

# Drop your geotagged photos into ./photos, then optionally caption them in
# ./photos/captions.json: { "IMG_1234.jpg": "Crossing into Portomarín" }

npm run dev       # builds route + photo data, then starts the dev server
npm run build     # production build into dist/
npm run preview   # preview the production build
```

Re-run `npm run build:photos` any time you add/remove photos.

### Photos without visible GPS EXIF

If a phone/export strips location data (common with messaging apps or
screenshots), the photo is skipped with a console warning — pull the
original file from your camera roll/cloud backup instead, or add it
manually to `src/data/photos.json`.

### HEIC photos

HEIC is decoded directly via `sharp`/libvips, no manual conversion needed --
just drop iPhone `.HEIC` files straight into `photos/` alongside your jpg/png
ones. If the same shot exists as both `.HEIC` and an exported `.jpeg` (same
base filename), the build keeps the HEIC original and skips the duplicate.

## Deploying

This is a fully static site after `npm run build` (just `dist/`) — Netlify,
GitHub Pages, Vercel, or Cloudflare Pages all work for free, and OSM tiles
need no server-side secrets or config.
