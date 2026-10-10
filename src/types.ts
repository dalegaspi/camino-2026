export interface Photo {
  id: string;
  file: string;
  lat: number;
  lng: number;
  takenAt: string | null;
  caption: string | null;
  width: number;
  height: number;
  kmFromSarria: number;
  offRouteKm: number;
  full: string;
  thumb: string;
}

export interface RouteStageProperties {
  name: string;
  startKm: number;
  endKm: number;
}

export type RouteGeoJSON = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  RouteStageProperties
> & {
  properties: { totalKm: number; source: string };
};
