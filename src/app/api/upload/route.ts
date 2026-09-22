import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { saveUpload, type StorageBucket } from "@/server/storage";

export const dynamic = "force-dynamic";

const ALLOWED: StorageBucket[] = [
  "media",
  "prescriptions",
  "consultations",
  "pod",
  "reports",
  "product-images",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const bucketRaw = String(form.get("bucket") ?? "media");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!ALLOWED.includes(bucketRaw as StorageBucket)) {
    return NextResponse.json({ error: "invalid bucket" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const saved = await saveUpload(bucketRaw as StorageBucket, {
    buffer: buf,
    filename: file.name || "upload.bin",
    contentType: file.type,
  });
  return NextResponse.json(saved);
}
