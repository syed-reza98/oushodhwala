import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { BUCKETS, type StorageBucket } from "./buckets";
import type { SavedUpload, StorageDriver, UploadInput } from "./types";

function uploadRoot() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.UPLOAD_DIR ?? "storage/uploads",
  );
}

function guessType(ext: string) {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export function createLocalStorage(): StorageDriver {
  return {
    async ensureBuckets() {
      const root = uploadRoot();
      await mkdir(root, { recursive: true });
      for (const b of BUCKETS) {
        await mkdir(path.join(/*turbopackIgnore: true*/ root, b), { recursive: true });
      }
    },

    async saveUpload(
      bucket: StorageBucket,
      file: UploadInput,
      subdir?: string,
    ): Promise<SavedUpload> {
      await this.ensureBuckets();
      const ext = path.extname(file.filename) || "";
      const key = `${randomUUID()}${ext}`;
      const relParts = subdir ? [bucket, subdir, key] : [bucket, key];
      const rel = relParts.join("/");
      const abs = path.join(uploadRoot(), ...relParts);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, file.buffer);
      const base = process.env.UPLOAD_PUBLIC_BASE ?? "/uploads";
      return { path: rel, publicUrl: `${base}/${rel}` };
    },

    async removeUpload(rel: string) {
      if (!rel || rel.includes("..")) return;
      try {
        await unlink(path.join(uploadRoot(), rel));
      } catch {
        // ignore missing
      }
    },

    absoluteUploadPath(rel: string) {
      return path.join(uploadRoot(), rel);
    },

    async readUpload(rel: string) {
      if (!rel || rel.includes("..")) return null;
      const abs = path.join(uploadRoot(), rel);
      const root = uploadRoot();
      if (!abs.startsWith(root)) return null;
      try {
        const buffer = await readFile(abs);
        return { buffer, contentType: guessType(path.extname(abs).toLowerCase()) };
      } catch {
        return null;
      }
    },
  };
}
