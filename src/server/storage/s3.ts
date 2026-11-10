import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { StorageBucket } from "./buckets";
import type { SavedUpload, StorageDriver, UploadInput } from "./types";

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} for S3/R2 storage`);
  return v;
}

function publicBase() {
  return (
    process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    process.env.UPLOAD_PUBLIC_BASE ||
    "/uploads"
  );
}

function guessType(ext: string, fallback?: string) {
  if (fallback) return fallback;
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

export function createS3Storage(): StorageDriver {
  const bucket = required("S3_BUCKET");
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });

  return {
    async ensureBuckets() {
      // Bucket must exist in S3/R2; folder prefixes are created on put.
    },

    async saveUpload(
      storageBucket: StorageBucket,
      file: UploadInput,
      subdir?: string,
    ): Promise<SavedUpload> {
      const ext = path.extname(file.filename) || "";
      const key = `${randomUUID()}${ext}`;
      const relParts = subdir ? [storageBucket, subdir, key] : [storageBucket, key];
      const rel = relParts.join("/");
      const contentType = guessType(ext, file.contentType);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: rel,
          Body: file.buffer,
          ContentType: contentType,
        }),
      );
      const base = publicBase();
      const publicUrl = base.startsWith("http") ? `${base}/${rel}` : `${base}/${rel}`;
      return { path: rel, publicUrl };
    },

    async removeUpload(rel: string) {
      if (!rel || rel.includes("..")) return;
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: rel }));
      } catch {
        // ignore
      }
    },

    absoluteUploadPath() {
      return null;
    },

    async readUpload(rel: string) {
      if (!rel || rel.includes("..")) return null;
      try {
        const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: rel }));
        const bytes = await out.Body?.transformToByteArray();
        if (!bytes) return null;
        return {
          buffer: Buffer.from(bytes),
          contentType: out.ContentType || guessType(path.extname(rel).toLowerCase()),
        };
      } catch {
        return null;
      }
    },
  };
}
