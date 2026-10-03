"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxImage = { src: string; alt: string; caption?: string };

type Labels = { close: string; previous: string; next: string; of: (i: number, n: number) => string };

const PL_LABELS: Labels = {
  close: "Zamknij",
  previous: "Poprzednie zdjęcie",
  next: "Następne zdjęcie",
  of: (i, n) => `${i} z ${n}`,
};

/** Full-screen photo viewer on a native <dialog>: Esc closes, arrow keys switch photos. */
export function Lightbox(props: { images: LightboxImage[]; index: number; onClose: () => void; labels?: Labels }) {
  const { images, onClose } = props;
  const labels = props.labels ?? PL_LABELS;
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(props.index);
  const image = images[index];
  const many = images.length > 1;

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const go = (step: number) => setIndex((i) => (i + step + images.length) % images.length);

  return (
    <dialog
      ref={dialog}
      // React propagates "close" up its tree; stop it so an enclosing dialog stays open.
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      // Clicking the dark backdrop (the dialog element itself) closes it.
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/85 p-0 backdrop:bg-black/80"
      aria-label={image.alt}
    >
      <div className="flex h-full flex-col text-white" onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-white/80">{many ? labels.of(index + 1, images.length) : image.caption}</span>
          <button
            onClick={() => dialog.current?.close()}
            aria-label={labels.close}
            autoFocus
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <X className="size-6" />
          </button>
        </div>
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4"
          onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/images or a local object URL */}
          <img src={image.src} alt={image.alt} className="max-h-full max-w-full rounded-lg object-contain" />
          {many && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label={labels.previous}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-ink/60 p-2.5 hover:bg-ink/80"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label={labels.next}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-ink/60 p-2.5 hover:bg-ink/80"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
        </div>
        {many && image.caption && <p className="px-4 pb-4 text-center text-sm text-white/80">{image.caption}</p>}
      </div>
    </dialog>
  );
}

/** A photo thumbnail that opens the viewer; keeps the image itself as the button content. */
export function PhotoButton(props: {
  src: string;
  alt: string;
  className?: string;
  onOpen: () => void;
  openLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onOpen}
      aria-label={`${props.openLabel ?? "Powiększ zdjęcie"}: ${props.alt}`}
      className="group relative shrink-0 cursor-zoom-in overflow-hidden rounded-lg focus-visible:outline-offset-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- served by /api/images */}
      <img src={props.src} alt="" className={`${props.className ?? ""} transition-transform group-hover:scale-[1.03]`} />
    </button>
  );
}
