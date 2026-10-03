// Browser helpers for the resident flow.

const MAX_SIDE = 1280;

/** Downscales a camera photo to a JPEG of at most MAX_SIDE px; returns the original if decoding fails. */
export async function downscaleImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export type Position = { lat: number; lng: number; accuracy?: number; demo: boolean };

// Kraków Main Square, used when the browser cannot provide a location (e.g. indoors at the demo).
export const DEMO_POSITION: Position = { lat: 50.06165, lng: 19.93732, demo: true };

export function getPosition(timeoutMs = 10_000): Promise<Position> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(DEMO_POSITION);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          demo: false,
        }),
      () => resolve(DEMO_POSITION),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
