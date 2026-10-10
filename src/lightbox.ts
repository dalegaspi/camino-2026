import type { Photo } from "./types";

export function createLightbox(): {
  open: (photo: Photo) => void;
  el: HTMLElement;
} {
  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `
    <div class="lightbox__backdrop" data-close></div>
    <div class="lightbox__content">
      <button class="lightbox__close" data-close aria-label="Close">&times;</button>
      <img class="lightbox__img" alt="" />
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

  function close() {
    el.classList.remove("lightbox--open");
  }

  el.querySelectorAll("[data-close]").forEach((node) =>
    node.addEventListener("click", close),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  function open(photo: Photo) {
    img.src = photo.full;
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

  return { open, el };
}
