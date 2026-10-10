import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./style.css";
import { initMap } from "./map";
import { createLightbox } from "./lightbox";
import type { Photo, RouteGeoJSON } from "./types";
import routeData from "./data/route.json";
import photoData from "./data/photos.json";

const route = routeData as unknown as RouteGeoJSON;
const photos = photoData as unknown as Photo[];

const app = document.getElementById("app")!;
app.innerHTML = `
  <header class="topbar">
    <h1>Camino Francés <span class="topbar__sub">Sarria → Santiago de Compostela</span></h1>
    <div class="topbar__stats">
      <strong>${route.properties.totalKm.toFixed(1)} km</strong>
      <span>${photos.length} photo${photos.length === 1 ? "" : "s"}</span>
    </div>
  </header>
  <main class="layout">
    <aside class="sidebar" id="sidebar"></aside>
    <div class="map" id="map"></div>
  </main>
`;

const sidebar = document.getElementById("sidebar")!;
const mapEl = document.getElementById("map")!;
const lightbox = createLightbox();

function renderSidebar(photos: Photo[], onSelect: (p: Photo) => void) {
  if (photos.length === 0) {
    sidebar.innerHTML = `
      <div class="sidebar__empty">
        <p>No geotagged photos yet.</p>
        <p>Drop photos with GPS EXIF into <code>./photos</code> and run
        <code>npm run build:photos</code>.</p>
      </div>
    `;
    return;
  }

  sidebar.innerHTML = `<ul class="photo-list"></ul>`;
  const list = sidebar.querySelector(".photo-list")!;
  for (const photo of photos) {
    const li = document.createElement("li");
    li.className = "photo-list__item";
    li.dataset.id = photo.id;
    const date = photo.takenAt
      ? new Date(photo.takenAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "";
    li.innerHTML = `
      <img class="photo-list__thumb" src="${photo.thumb}" loading="lazy" alt="" />
      <div class="photo-list__text">
        <div class="photo-list__caption">${photo.caption ?? photo.file}</div>
        <div class="photo-list__sub">${date ? date + " · " : ""}km ${photo.kmFromSarria.toFixed(1)}</div>
      </div>
    `;
    li.addEventListener("click", () => onSelect(photo));
    list.appendChild(li);
  }
}

const { focusPhoto } = initMap(mapEl, route, photos, (photo) => {
  lightbox.open(photo);
  highlightListItem(photo.id);
});

function highlightListItem(id: string) {
  sidebar
    .querySelectorAll(".photo-list__item--active")
    .forEach((el) => el.classList.remove("photo-list__item--active"));
  const el = sidebar.querySelector<HTMLElement>(`[data-id="${id}"]`);
  el?.classList.add("photo-list__item--active");
  el?.scrollIntoView({ block: "nearest" });
}

renderSidebar(photos, (photo) => {
  focusPhoto(photo);
  lightbox.open(photo);
  highlightListItem(photo.id);
});
