import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const BUCKETS = [
  "media",
  "prescriptions",
  "consultations",
  "pod",
  "reports",
  "product-images",
] as const;

export type StorageBucket = (typeof BUCKETS)[number];

function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
}

export async function ensureBuckets() {
  const root = uploadRoot();
  await mkdir(root, { recursive: true });
  for (const b of BUCKETS) {
    await mkdir(path.join(root, b), { recursive: true });
  }
}

export async function saveUpload(
  bucket: StorageBucket,
  file: { buffer: Buffer; filename: string; contentType?: string },
): Promise<{ path: string; publicUrl: string }> {
  await ensureBuckets();
  const ext = path.extname(file.filename) || "";
  const key = `${randomUUID()}${ext}`;
  const abs = path.join(uploadRoot(), bucket, key);
  await writeFile(abs, file.buffer);
  const base = process.env.UPLOAD_PUBLIC_BASE ?? "/uploads";
  const rel = `${bucket}/${key}`;
  return {
    path: rel,
    publicUrl: `${base}/${rel}`,
  };
}

export function absoluteUploadPath(rel: string) {
  return path.join(uploadRoot(), rel);
}
