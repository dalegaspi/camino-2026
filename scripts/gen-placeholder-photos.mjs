// One-off: generates placeholder geotagged photos spread along the route so
// you can preview the SPA layout before dropping in real photos. Not part
// of the app build — run manually, then delete ./photos/placeholder-*.jpg
// (or just add real photos over them) when ready.
import sharp from "sharp";
import piexif from "piexifjs";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const photosDir = path.join(root, "photos");
mkdirSync(photosDir, { recursive: true });

const routeLine = JSON.parse(
  readFileSync(path.join(root, "src", "data", "route-line.json"), "utf8"),
);

function pointAtKm(km) {
  let best = routeLine[0];
  for (const p of routeLine) {
    if (Math.abs(p.km - km) < Math.abs(best.km - km)) best = p;
  }
  return best;
}

function toDMS(deg) {
  const d = Math.floor(deg);
  const minFloat = (deg - d) * 60;
  const m = Math.floor(minFloat);
  const s = Math.round((minFloat - m) * 60 * 100);
  return [
    [d, 1],
    [m, 1],
    [s, 100],
  ];
}

const shots = [
  { km: 0.5, color: { r: 139, g: 94, b: 60 }, label: "Sarria", date: "2024:05:11 08:15:00", caption: "Setting off from Sarria" },
  { km: 4.2, color: { r: 90, g: 130, b: 70 }, label: "Barbadelo", date: "2024:05:11 09:05:00", caption: "Morning mist over Barbadelo" },
  { km: 13.3, color: { r: 70, g: 110, b: 150 }, label: "Ferreiros", date: "2024:05:11 10:40:00", caption: null },
  { km: 22.0, color: { r: 180, g: 150, b: 90 }, label: "Portomarin", date: "2024:05:11 13:10:00", caption: "Crossing into Portomarín over the Miño" },
  { km: 30.1, color: { r: 100, g: 90, b: 150 }, label: "Gonzar", date: "2024:05:12 08:30:00", caption: null },
  { km: 47.0, color: { r: 160, g: 100, b: 100 }, label: "Palas de Rei", date: "2024:05:12 14:50:00", caption: "Lunch stop in Palas de Rei" },
  { km: 61.5, color: { r: 120, g: 140, b: 90 }, label: "Melide", date: "2024:05:13 11:20:00", caption: "Pulpo for lunch in Melide" },
  { km: 72.6, color: { r: 80, g: 150, b: 160 }, label: "Ribadiso", date: "2024:05:13 15:40:00", caption: null },
  { km: 76.0, color: { r: 150, g: 120, b: 170 }, label: "Arzua", date: "2024:05:13 17:00:00", caption: "Arzúa cheese country" },
  { km: 92.2, color: { r: 60, g: 100, b: 80 }, label: "Santa Irene", date: "2024:05:14 10:10:00", caption: null },
  { km: 110.1, color: { r: 220, g: 170, b: 90 }, label: "Monte do Gozo", date: "2024:05:15 09:30:00", caption: "First glimpse of the cathedral from Monte do Gozo" },
  { km: 114.2, color: { r: 190, g: 60, b: 60 }, label: "Santiago", date: "2024:05:15 12:00:00", caption: "Arrived! Praza do Obradoiro" },
];

for (const shot of shots) {
  const pt = pointAtKm(shot.km);
  const base = await sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 3,
      background: shot.color,
    },
  })
    .jpeg()
    .toBuffer();

  let dataUrl = "data:image/jpeg;base64," + base.toString("base64");
  const lat = pt.lat;
  const lng = pt.lon;
  const gps = {
    [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? "N" : "S",
    [piexif.GPSIFD.GPSLatitude]: toDMS(Math.abs(lat)),
    [piexif.GPSIFD.GPSLongitudeRef]: lng >= 0 ? "E" : "W",
    [piexif.GPSIFD.GPSLongitude]: toDMS(Math.abs(lng)),
  };
  const exifObj = {
    GPS: gps,
    Exif: { [piexif.ExifIFD.DateTimeOriginal]: shot.date },
  };
  const exifStr = piexif.dump(exifObj);
  const withExif = piexif.insert(exifStr, dataUrl);
  const buf = Buffer.from(withExif.split(",")[1], "base64");
  const filename = `placeholder-${shot.label.toLowerCase().replace(/\s+/g, "-")}.jpg`;
  writeFileSync(path.join(photosDir, filename), buf);
  console.log(`wrote ${filename} @ km ${shot.km}`);
}

// Captions sidecar (merged with any existing captions.json entries).
const captionsPath = path.join(photosDir, "captions.json");
let captions = {};
try {
  captions = JSON.parse(readFileSync(captionsPath, "utf8"));
} catch {}
for (const shot of shots) {
  if (shot.caption) {
    const filename = `placeholder-${shot.label.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    captions[filename] = shot.caption;
  }
}
writeFileSync(captionsPath, JSON.stringify(captions, null, 2));
console.log("updated captions.json");
