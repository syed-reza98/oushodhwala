import type { StorageBucket } from "./buckets";

export type { StorageBucket };

export type UploadInput = {
  buffer: Buffer;
  filename: string;
  contentType?: string;
};

export type SavedUpload = {
  path: string;
  publicUrl: string;
};

export type StorageDriver = {
  ensureBuckets(): Promise<void>;
  saveUpload(
    bucket: StorageBucket,
    file: UploadInput,
    subdir?: string,
  ): Promise<SavedUpload>;
  removeUpload(rel: string): Promise<void>;
  /** Absolute local path when driver is disk; null for remote-only drivers. */
  absoluteUploadPath(rel: string): string | null;
  /** Read bytes for serving via /api/uploads; null if caller should redirect to publicUrl. */
  readUpload(rel: string): Promise<{ buffer: Buffer; contentType: string } | null>;
};
