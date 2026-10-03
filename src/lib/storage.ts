import { randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";

const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });

function bucket() {
  const name = process.env.GCS_BUCKET;
  if (!name) throw new Error("GCS_BUCKET is not set");
  return storage.bucket(name);
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Stores a report photo and returns its object path inside the bucket. */
export async function uploadImage(data: Buffer, contentType: string): Promise<string> {
  const ext = EXTENSIONS[contentType] ?? "jpg";
  const path = `reports/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
  await bucket().file(path).save(data, { contentType, resumable: false });
  return path;
}

/** Photos stay private in the bucket and are served through /api/images. */
export function imageUrl(path: string): string {
  return `/api/images/${path}`;
}

export async function readImage(path: string) {
  const file = bucket().file(path);
  const [[metadata], [contents]] = await Promise.all([file.getMetadata(), file.download()]);
  return { contents, contentType: metadata.contentType ?? "image/jpeg" };
}

export async function saveFile(path: string, data: Buffer | Uint8Array, contentType: string): Promise<string> {
  await bucket().file(path).save(Buffer.from(data), { contentType, resumable: false });
  return path;
}
