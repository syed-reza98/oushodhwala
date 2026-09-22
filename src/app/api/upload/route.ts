import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { auth } from "@/server/auth/config";
import { hasStaffAccess } from "@/server/auth/roles";
import { saveUpload, type StorageBucket } from "@/server/storage";

export const dynamic = "force-dynamic";

const ALLOWED_BUCKETS: StorageBucket[] = [
  "media",
  "prescriptions",
  "consultations",
  "pod",
  "reports",
  "product-images",
];

const STAFF_ONLY_BUCKETS: StorageBucket[] = [
  "media",
  "reports",
  "pod",
  "product-images",
];

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".svg",
  ".pdf",
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const bucketRaw = String(form.get("bucket") ?? "media") as StorageBucket;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  if (!ALLOWED_BUCKETS.includes(bucketRaw)) {
    return NextResponse.json({ error: "invalid bucket" }, { status: 400 });
  }

  // Restrict staff-only buckets from regular users
  const isStaff = hasStaffAccess(session.user.roles ?? []);
  if (STAFF_ONLY_BUCKETS.includes(bucketRaw) && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 15MB)" },
      { status: 413 },
    );
  }

  const ext = path.extname(file.name || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPG, PNG, WebP, PDF" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const saved = await saveUpload(bucketRaw, {
    buffer: buf,
    filename: file.name || "upload.bin",
    contentType: file.type || "application/octet-stream",
  });
  return NextResponse.json(saved);
}

