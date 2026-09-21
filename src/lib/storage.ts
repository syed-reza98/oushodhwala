/** Local upload helpers — replaces Supabase Storage in the UI layer. */

export function isExternalUrl(ref: string | null | undefined) {
  return !!ref && /^https?:\/\//i.test(ref);
}

const PUBLIC_BASE = process.env.NEXT_PUBLIC_UPLOAD_BASE || "/uploads";

/** Public URL for a stored path (local disk via /uploads). */
export function resolveFileUrl(bucket: string, ref: string | null | undefined) {
  if (!ref) return "";
  if (isExternalUrl(ref)) return ref;
  const clean = ref.replace(/^\/+/, "");
  if (clean.startsWith(`${bucket}/`)) return `${PUBLIC_BASE}/${clean}`;
  return `${PUBLIC_BASE}/${bucket}/${clean}`;
}

export function resolveDownloadUrl(bucket: string, ref: string | null | undefined, _fileName?: string) {
  return resolveFileUrl(bucket, ref);
}

/** Browser upload via `/api/upload` Route Handler. */
export async function uploadFile(bucket: string, _path: string, file: Blob, _contentType?: string) {
  const fd = new FormData();
  fd.set("bucket", bucket);
  fd.set("file", file instanceof File ? file : new File([file], "upload.bin"));
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "upload failed");
  }
  const saved = (await res.json()) as { path: string; url?: string };
  return saved.path;
}

export function safeName(name: string) {
  return name.replace(/[^\w.-]+/g, "_").slice(-80);
}
