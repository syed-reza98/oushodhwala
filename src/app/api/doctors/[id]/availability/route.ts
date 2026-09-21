import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { appointments, doctorBlackouts } from "@/server/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function dayKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Public: blackout days + taken slot ISO timestamps for a doctor. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const day = (req.nextUrl.searchParams.get("day") ?? "").trim();

  const blackouts = await db
    .select({
      day: doctorBlackouts.day,
      reason: doctorBlackouts.reason,
    })
    .from(doctorBlackouts)
    .where(eq(doctorBlackouts.doctorId, id));

  let taken: string[] = [];
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const start = `${day} 00:00:00.000`;
    const endDate = new Date(`${day}T00:00:00`);
    endDate.setDate(endDate.getDate() + 1);
    const end = `${dayKeyFromDate(endDate)} 00:00:00.000`;

    const rows = await db
      .select({ scheduledAt: appointments.scheduledAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, id),
          ne(appointments.status, "cancelled"),
          gte(appointments.scheduledAt, start),
          lt(appointments.scheduledAt, end),
        ),
      );
    taken = rows.map((r) => {
      const d = new Date(r.scheduledAt.includes("T") ? r.scheduledAt : r.scheduledAt.replace(" ", "T") + "Z");
      // Prefer HH:MM local-ish from stored mysql datetime string
      const m = r.scheduledAt.match(/(\d{2}):(\d{2})/);
      return m ? `${m[1]}:${m[2]}` : d.toISOString();
    });
  }

  return NextResponse.json({
    blackouts: blackouts.map((b) => ({ day: b.day, reason: b.reason ?? "" })),
    taken,
  });
}
