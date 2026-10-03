// Browser helpers for the resident flow.
import type { LocationSource } from "@/lib/types";

const MAX_SIDE = 1280;

/** Downscales a camera photo to a JPEG of at most MAX_SIDE px; returns the original if decoding fails. */
/** Resolves to the fallback when the promise takes longer than ms (some mobile browsers never settle). */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Older iOS Safari: fall back to an <img> element below.
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

/** Downscales a camera photo to a JPEG of at most MAX_SIDE px; returns the original if decoding fails or stalls. */
export function downscaleImage(file: File): Promise<Blob> {
  const work = (async () => {
    const image = await decode(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d")!.drawImage(image.source, 0, 0, canvas.width, canvas.height);
    image.release();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  })();
  return withTimeout(work, 8000, file);
}

export type Position = { lat: number; lng: number; accuracy?: number; source: LocationSource };

// Kraków Main Square, used when the browser cannot provide a location (e.g. indoors at the demo).
export const DEMO_POSITION: Position = { lat: 50.06165, lng: 19.93732, source: "demo" };

/** GPS from the photo's EXIF metadata; must run on the original file, before downscaling. */
export async function readPhotoPosition(file: File): Promise<Position | null> {
  try {
    const { gps } = await import("exifr");
    const coords = await gps(file);
    if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return null;
    return { lat: coords.latitude, lng: coords.longitude, source: "exif" };
  } catch {
    return null;
  }
}

/**
 * Device location, never hanging: iOS does not call back while its permission prompt is pending (or hidden behind
 * the camera), and the API timeout only starts after permission is granted, so a hard limit is added here.
 */
export function getPosition(timeoutMs = 10_000): Promise<Position> {
  return withTimeout(requestPosition(timeoutMs), timeoutMs + 1000, DEMO_POSITION);
}

function requestPosition(timeoutMs: number): Promise<Position> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(DEMO_POSITION);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "device",
        }),
      () => resolve(DEMO_POSITION),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
