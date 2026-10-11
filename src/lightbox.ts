import type { Photo } from "./types";
import { asset } from "./asset";

export function createLightbox(
  photos: Photo[],
  onNavigate?: (photo: Photo) => void,
): {
  open: (photo: Photo) => void;
  el: HTMLElement;
} {
  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `
    <div class="lightbox__backdrop" data-close></div>
    <div class="lightbox__content">
      <button class="lightbox__close" data-close aria-label="Close">&times;</button>
      <button class="lightbox__nav lightbox__nav--prev" aria-label="Previous photo">&lsaquo;</button>
      <img class="lightbox__img" alt="" />
      <button class="lightbox__nav lightbox__nav--next" aria-label="Next photo">&rsaquo;</button>
      <div class="lightbox__meta">
        <div class="lightbox__caption"></div>
        <div class="lightbox__sub"></div>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  const img = el.querySelector(".lightbox__img") as HTMLImageElement;
  const caption = el.querySelector(".lightbox__caption") as HTMLElement;
  const sub = el.querySelector(".lightbox__sub") as HTMLElement;
  const prevBtn = el.querySelector(".lightbox__nav--prev") as HTMLButtonElement;
  const nextBtn = el.querySelector(".lightbox__nav--next") as HTMLButtonElement;

  let currentIndex = -1;

  function close() {
    el.classList.remove("lightbox--open");
  }

  function render(index: number) {
    const photo = photos[index];
    if (!photo) return;
    currentIndex = index;
    img.src = asset(photo.full);
    img.alt = photo.caption ?? photo.file;
    caption.textContent = photo.caption ?? photo.file;
    const date = photo.takenAt
      ? new Date(photo.takenAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Date unknown";
    sub.textContent = `${date} · km ${photo.kmFromSarria.toFixed(1)} from Sarria`;
    el.classList.add("lightbox--open");
  }

  function go(delta: number) {
    if (photos.length <= 1 || currentIndex === -1) return;
    const nextIndex = (currentIndex + delta + photos.length) % photos.length;
    render(nextIndex);
    onNavigate?.(photos[nextIndex]!);
  }

  el.querySelectorAll("[data-close]").forEach((node) =>
    node.addEventListener("click", close),
  );
  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));

  if (photos.length <= 1) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  }

  document.addEventListener("keydown", (e) => {
    if (!el.classList.contains("lightbox--open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
  });

  function open(photo: Photo) {
    const idx = photos.findIndex((p) => p.id === photo.id);
    render(idx === -1 ? 0 : idx);
  }

  return { open, el };
}
