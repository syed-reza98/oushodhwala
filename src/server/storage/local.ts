import { mkdir, unlink, writeFile } from "node:fs/promises";
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
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR ?? "storage/uploads");
}

export async function ensureBuckets() {
  const root = uploadRoot();
  await mkdir(root, { recursive: true });
  for (const b of BUCKETS) {
    await mkdir(path.join(/*turbopackIgnore: true*/ uploadRoot(), b), { recursive: true });
  }
}

export async function saveUpload(
  bucket: StorageBucket,
  file: { buffer: Buffer; filename: string; contentType?: string },
  subdir?: string,
): Promise<{ path: string; publicUrl: string }> {
  await ensureBuckets();
  const ext = path.extname(file.filename) || "";
  const key = `${randomUUID()}${ext}`;
  const relParts = subdir ? [bucket, subdir, key] : [bucket, key];
  const rel = relParts.join("/");
  const abs = path.join(uploadRoot(), ...relParts);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, file.buffer);
  const base = process.env.UPLOAD_PUBLIC_BASE ?? "/uploads";
  return {
    path: rel,
    publicUrl: `${base}/${rel}`,
  };
}

export async function removeUpload(rel: string) {
  if (!rel || rel.includes("..")) return;
  try {
    await unlink(path.join(uploadRoot(), rel));
  } catch {
    // ignore missing file
  }
}

export function absoluteUploadPath(rel: string) {
  return path.join(uploadRoot(), rel);
}
