// Town waypoints at each official stage boundary (coords from OpenStreetMap,
// cross-checked against trailsplits.com's stage-end markers).
export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  kind: "start" | "stage" | "end";
  km: number;
}

export const waypoints: Waypoint[] = [
  { name: "Sarria", lat: 42.7811, lng: -7.4151, kind: "start", km: 0 },
  { name: "Portomarín", lat: 42.80648, lng: -7.61704, kind: "stage", km: 22.2 },
  { name: "Palas de Rei", lat: 42.87329, lng: -7.8699, kind: "stage", km: 47.2 },
  { name: "Melide", lat: 42.91376, lng: -8.0139, kind: "stage", km: 61.6 },
  { name: "Arzúa", lat: 42.92621, lng: -8.16343, kind: "stage", km: 76 },
  { name: "O Pedrouzo", lat: 42.90719, lng: -8.36405, kind: "stage", km: 95.2 },
  {
    name: "Santiago de Compostela",
    lat: 42.8805,
    lng: -8.5457,
    kind: "end",
    km: 114.3,
  },
];
