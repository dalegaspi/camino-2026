import type { Photo } from "./types";
import { asset } from "./asset";

const FLIP_IN = "flip-in-ver-right";
const FLIP_OUT = "flip-out-ver-left";
const FADE_IN = "fade-in";
const FADE_OUT = "fade-out";
const ALL_ANIM_CLASSES = [FLIP_IN, FLIP_OUT, FADE_IN, FADE_OUT];

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
      <div class="lightbox__card">
        <img class="lightbox__img" alt="" />
        <div class="lightbox__meta">
          <div class="lightbox__caption"></div>
          <div class="lightbox__sub"></div>
        </div>
      </div>
      <button class="lightbox__nav lightbox__nav--next" aria-label="Next photo">&rsaquo;</button>
    </div>
  `;
  document.body.appendChild(el);

  const card = el.querySelector(".lightbox__card") as HTMLElement;
  const img = el.querySelector(".lightbox__img") as HTMLImageElement;
  const caption = el.querySelector(".lightbox__caption") as HTMLElement;
  const sub = el.querySelector(".lightbox__sub") as HTMLElement;
  const closeBtn = el.querySelector(".lightbox__close") as HTMLButtonElement;
  const prevBtn = el.querySelector(".lightbox__nav--prev") as HTMLButtonElement;
  const nextBtn = el.querySelector(".lightbox__nav--next") as HTMLButtonElement;
  const chromeButtons = [closeBtn, prevBtn, nextBtn];

  let currentIndex = -1;

  // Remove any animation class, force a reflow, then add the given one so
  // the CSS animation reliably restarts even if the same class was just
  // used (fill-mode: both would otherwise leave it "stuck").
  function playAnim(target: HTMLElement, className: string, onDone?: () => void) {
    target.classList.remove(...ALL_ANIM_CLASSES);
    void target.offsetWidth;
    target.classList.add(className);
    const handler = () => {
      target.removeEventListener("animationend", handler);
      target.classList.remove(className);
      onDone?.();
    };
    target.addEventListener("animationend", handler, { once: true });
  }

  function playCard(className: string, onDone?: () => void) {
    playAnim(card, className, onDone);
  }

  // Close/prev/next buttons fade out/in in sync with the card's flip, so
  // they don't visibly "jump" when the card's size changes between photos
  // of different aspect ratios.
  function playChrome(className: string) {
    chromeButtons.forEach((btn) => playAnim(btn, className));
  }

  function applyContent(photo: Photo) {
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
  }

  function render(index: number, animateTransition: boolean) {
    const photo = photos[index];
    if (!photo) return;
    currentIndex = index;

    const alreadyOpen = el.classList.contains("lightbox--open");
    if (animateTransition && alreadyOpen) {
      // Current photo flips out, then the new one flips in; chrome buttons
      // fade out/in alongside, at the same cadence.
      playCard(FLIP_OUT, () => {
        applyContent(photo);
        playCard(FLIP_IN);
        playChrome(FADE_IN);
      });
      playChrome(FADE_OUT);
    } else {
      applyContent(photo);
      el.classList.add("lightbox--open");
      playCard(FLIP_IN);
      playChrome(FADE_IN);
    }
  }

  function close() {
    if (!el.classList.contains("lightbox--open")) return;
    playCard(FLIP_OUT, () => {
      el.classList.remove("lightbox--open");
    });
    playChrome(FADE_OUT);
  }

  function go(delta: number) {
    if (photos.length <= 1 || currentIndex === -1) return;
    const nextIndex = (currentIndex + delta + photos.length) % photos.length;
    render(nextIndex, true);
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
    render(idx === -1 ? 0 : idx, false);
  }

  return { open, el };
}
