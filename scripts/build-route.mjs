// Converts the per-stage GPX tracks (public/route/stage*.gpx) into a single
// baked GeoJSON file the frontend loads at runtime (src/data/route.json).
// Source: OpenStreetMap contributors, via trailsplits.com (ODbL).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routeDir = path.join(__dirname, "..", "public", "route");
const outDir = path.join(__dirname, "..", "src", "data");
mkdirSync(outDir, { recursive: true });

const stages = [
  { file: "stage1.gpx", name: "Sarria → Portomarín" },
  { file: "stage2.gpx", name: "Portomarín → Palas de Rei" },
  { file: "stage3.gpx", name: "Palas de Rei → Melide" },
  { file: "stage4.gpx", name: "Melide → Arzúa" },
  { file: "stage5.gpx", name: "Arzúa → O Pedrouzo" },
  { file: "stage6.gpx", name: "O Pedrouzo → Santiago de Compostela" },
];

function haversine([lon1, lat1], [lon2, lat2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const trkptRe = /<trkpt\s+lat="(-?[\d.]+)"\s+lon="(-?[\d.]+)"[^>]*>/g;

const features = [];
let cumulativeKm = 0;
let overallCoords = [];

for (const stage of stages) {
  const xml = readFileSync(path.join(routeDir, stage.file), "utf8");
  const coords = [];
  for (const m of xml.matchAll(trkptRe)) {
    coords.push([parseFloat(m[2]), parseFloat(m[1])]); // [lon, lat]
  }
  if (coords.length < 2) {
    console.warn(`Stage ${stage.file} has too few points, skipping`);
    continue;
  }

  const startKm = cumulativeKm;
  for (let i = 1; i < coords.length; i++) {
    cumulativeKm += haversine(coords[i - 1], coords[i]) / 1000;
  }

  features.push({
    type: "Feature",
    properties: {
      name: stage.name,
      startKm: Number(startKm.toFixed(2)),
      endKm: Number(cumulativeKm.toFixed(2)),
    },
    geometry: { type: "LineString", coordinates: coords },
  });

  overallCoords = overallCoords.concat(
    overallCoords.length ? coords.slice(1) : coords,
  );
}

const geojson = {
  type: "FeatureCollection",
  properties: {
    totalKm: Number(cumulativeKm.toFixed(2)),
    source:
      "OpenStreetMap contributors (ODbL), via trailsplits.com — Camino Francés relations 2163565 & 2163559",
  },
  features,
};

writeFileSync(
  path.join(outDir, "route.json"),
  JSON.stringify(geojson, null, 2),
);

// Also expose the single continuous line + per-point cumulative distance,
// used to project photos onto the route ("X km from Sarria").
let d = 0;
const line = overallCoords.map((c, i) => {
  if (i > 0) d += haversine(overallCoords[i - 1], c) / 1000;
  return { lon: c[0], lat: c[1], km: Number(d.toFixed(3)) };
});
writeFileSync(
  path.join(outDir, "route-line.json"),
  JSON.stringify(line),
);

console.log(
  `Built route.json: ${features.length} stages, ${cumulativeKm.toFixed(1)} km total, ${overallCoords.length} points`,
);
