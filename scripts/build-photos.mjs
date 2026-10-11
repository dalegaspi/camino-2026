// Scans ./photos for geotagged pilgrim photos, extracts GPS + capture time
// from EXIF, generates resized full/thumbnail JPEGs into public/photos/, and
// writes a manifest (src/data/photos.json) consumed by the SPA.
//
// Usage: npm run build:photos
//
// Drop your original photos into ./photos (jpg/jpeg/png/heic — HEIC is
// decoded directly via sharp/libvips, no manual conversion needed). Videos
// (.mov/.mp4/etc) are ignored. If the same shot exists as both HEIC and a
// JPEG export (same base filename), the HEIC original is used and the JPEG
// duplicate is skipped. Optionally add ./photos/captions.json:
//   { "IMG_1234.jpg": "First views of Portomarín" }
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import exifr from "exifr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const photosDir = path.join(root, "photos");
const fullOutDir = path.join(root, "public", "photos", "full");
const thumbOutDir = path.join(root, "public", "photos", "thumb");
const dataOutDir = path.join(root, "src", "data");

mkdirSync(photosDir, { recursive: true });
mkdirSync(fullOutDir, { recursive: true });
mkdirSync(thumbOutDir, { recursive: true });
mkdirSync(dataOutDir, { recursive: true });

const captionsPath = path.join(photosDir, "captions.json");
const captions = existsSync(captionsPath)
  ? JSON.parse(readFileSync(captionsPath, "utf8"))
  : {};

const routeLine = JSON.parse(
  readFileSync(path.join(dataOutDir, "route-line.json"), "utf8"),
);

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Project a point onto the nearest vertex of the route polyline.
// (Good enough resolution here: ~2200 points over 114 km, ~50m spacing.)
function projectOntoRoute(lat, lon) {
  let best = null;
  for (const p of routeLine) {
    const dist = haversineKm(lat, lon, p.lat, p.lon);
    if (!best || dist < best.offRouteKm) {
      best = { kmFromSarria: p.km, offRouteKm: dist };
    }
  }
  return best;
}

function slugify(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const exts = new Set([".jpg", ".jpeg", ".png", ".heic"]);
const allMatching = readdirSync(photosDir).filter((f) =>
  exts.has(path.extname(f).toLowerCase()),
);

// Dedupe same-shot HEIC+JPEG pairs (same base filename, e.g. IMG_1234.HEIC
// and IMG_1234.jpeg exported from the same Live Photo): prefer the HEIC
// original.
const byBase = new Map();
for (const f of allMatching) {
  const base = f.replace(/\.[^.]+$/, "");
  const ext = path.extname(f).toLowerCase();
  const existing = byBase.get(base);
  if (!existing) {
    byBase.set(base, f);
  } else if (ext === ".heic" && path.extname(existing).toLowerCase() !== ".heic") {
    console.log(`  dedupe: keeping ${f}, skipping duplicate ${existing}`);
    byBase.set(base, f);
  } else {
    console.log(`  dedupe: keeping ${existing}, skipping duplicate ${f}`);
  }
}
const files = [...byBase.values()].sort();

if (files.length === 0) {
  console.log(
    `No photos found in ${photosDir}. Drop geotagged jpg/jpeg/png/heic files there and re-run.`,
  );
  writeFileSync(path.join(dataOutDir, "photos.json"), "[]\n");
  process.exit(0);
}

const manifest = [];
let skippedNoGps = 0;

for (const file of files) {
  const fullPath = path.join(photosDir, file);
  const buf = readFileSync(fullPath);
  const gps = await exifr.gps(buf).catch(() => null);
  if (!gps || typeof gps.latitude !== "number") {
    console.warn(`  skip (no GPS EXIF): ${file}`);
    skippedNoGps++;
    continue;
  }
  const exif = await exifr
    .parse(buf, { pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"] })
    .catch(() => ({}));
  const takenAt =
    exif?.DateTimeOriginal ?? exif?.CreateDate ?? exif?.ModifyDate ?? null;

  const id = slugify(file);
  const img = sharp(buf).rotate(); // auto-orient from EXIF
  const meta = await img.metadata();

  await img
    .clone()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(path.join(fullOutDir, `${id}.jpg`));

  await img
    .clone()
    .resize({ width: 320, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toFile(path.join(thumbOutDir, `${id}.jpg`));

  const proj = projectOntoRoute(gps.latitude, gps.longitude);

  manifest.push({
    id,
    file,
    lat: gps.latitude,
    lng: gps.longitude,
    takenAt: takenAt ? new Date(takenAt).toISOString() : null,
    caption: captions[file] ?? null,
    width: meta.width,
    height: meta.height,
    kmFromSarria: Number(proj.kmFromSarria.toFixed(2)),
    offRouteKm: Number(proj.offRouteKm.toFixed(2)),
    full: `/photos/full/${id}.jpg`,
    thumb: `/photos/thumb/${id}.jpg`,
  });

  console.log(`  ok: ${file} -> ${id} (km ${proj.kmFromSarria.toFixed(1)})`);
}

manifest.sort((a, b) => {
  if (a.takenAt && b.takenAt) return a.takenAt.localeCompare(b.takenAt);
  return a.kmFromSarria - b.kmFromSarria;
});

writeFileSync(
  path.join(dataOutDir, "photos.json"),
  JSON.stringify(manifest, null, 2),
);

console.log(
  `\nBuilt photos.json: ${manifest.length} photos, skipped ${skippedNoGps} without GPS.`,
);
