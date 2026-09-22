import type { StorageDriver } from "./types";
import { createLocalStorage } from "./local";
import { createS3Storage } from "./s3";

export type { StorageBucket, SavedUpload, UploadInput } from "./types";
export { BUCKETS } from "./buckets";

let cached: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (cached) return cached;
  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  cached = driver === "s3" || driver === "r2" ? createS3Storage() : createLocalStorage();
  return cached;
}

export async function ensureBuckets() {
  return getStorage().ensureBuckets();
}

export async function saveUpload(
  ...args: Parameters<StorageDriver["saveUpload"]>
) {
  return getStorage().saveUpload(...args);
}

export async function removeUpload(rel: string) {
  return getStorage().removeUpload(rel);
}

export function absoluteUploadPath(rel: string) {
  return getStorage().absoluteUploadPath(rel);
}

export async function readUpload(rel: string) {
  return getStorage().readUpload(rel);
}
