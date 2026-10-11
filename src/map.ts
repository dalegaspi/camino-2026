import L from "leaflet";
// leaflet.markercluster's UMD build expects a global `L` to patch.
(globalThis as any).L = L;
import "leaflet.markercluster";
import type { RouteGeoJSON, Photo } from "./types";
import { waypoints } from "./waypoints";
import { asset } from "./asset";

export interface MapHandles {
  map: L.Map;
  focusPhoto: (photo: Photo) => void;
}

export function initMap(
  container: HTMLElement,
  route: RouteGeoJSON,
  photos: Photo[],
  onPhotoClick: (photo: Photo) => void,
): MapHandles {
  const map = L.map(container, {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([42.84, -7.95], 10);

  // Free, no-key tile layer: the standard OpenStreetMap raster tiles.
  // Fine for personal/low-traffic use under the OSM tile usage policy
  // (https://operations.osmfoundation.org/policies/tiles/); for heavier
  // traffic, self-host tiles or use a commercial provider instead.
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: "abc",
  }).addTo(map);

  const routeLayer = L.geoJSON(route, {
    style: { color: "#c0392b", weight: 4, opacity: 0.85 },
  }).addTo(map);

  // Stage waypoint pins (towns at each stage end).
  for (const wp of waypoints) {
    const isEndpoint = wp.kind !== "stage";
    L.circleMarker([wp.lat, wp.lng], {
      radius: isEndpoint ? 7 : 5,
      color: "#1b1b1b",
      weight: 1.5,
      fillColor: isEndpoint ? "#2d6a4f" : "#ffffff",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(`${wp.name} · km ${wp.km.toFixed(1)}`, {
        direction: "top",
      });
  }

  // Photo markers, clustered so dense clusters of photos (e.g. a town)
  // collapse into a single pin until zoomed in.
  const cluster = L.markerClusterGroup({
    maxClusterRadius: 45,
    spiderfyOnMaxZoom: true,
  });

  const markerByPhotoId = new Map<string, L.Marker>();

  for (const photo of photos) {
    const icon = L.divIcon({
      className: "photo-pin",
      html: `<div class="photo-pin__thumb" style="background-image:url('${asset(photo.thumb)}')"></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
    const marker = L.marker([photo.lat, photo.lng], { icon });
    marker.on("click", () => onPhotoClick(photo));
    markerByPhotoId.set(photo.id, marker);
    cluster.addLayer(marker);
  }
  map.addLayer(cluster);

  const bounds = routeLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [24, 24] });
  } else {
    map.setView([42.84, -7.95], 10);
  }

  function focusPhoto(photo: Photo) {
    map.setView([photo.lat, photo.lng], 15, { animate: true });
    const marker = markerByPhotoId.get(photo.id);
    if (marker) {
      cluster.zoomToShowLayer(marker, () => marker.openPopup?.());
    }
  }

  return { map, focusPhoto };
}
