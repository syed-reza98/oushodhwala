import { NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "@/server/db";
import { appointments, diagnosticBookings, orders } from "@/server/db/schema";
import { requireStaff } from "@/server/services/authz";

export const dynamic = "force-dynamic";

const UNPAID = ["pending", "unpaid", "due"] as const;

function unpaidPaymentStatus(
  col: typeof orders.paymentStatus | typeof diagnosticBookings.paymentStatus,
) {
  return or(inArray(col, [...UNPAID]), isNull(col));
}

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 401 });
  }

  const [orderRows, apptRows, diagRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        customerName: orders.customerName,
        total: orders.total,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(ne(orders.status, "cancelled"), unpaidPaymentStatus(orders.paymentStatus)))
      .orderBy(desc(orders.createdAt))
      .limit(100),
    db
      .select({
        id: appointments.id,
        invoiceNo: appointments.invoiceNo,
        patientName: appointments.patientName,
        fee: appointments.fee,
        paymentMethod: appointments.paymentMethod,
        paymentStatus: appointments.paymentStatus,
        status: appointments.status,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .where(
        and(
          ne(appointments.status, "cancelled"),
          eq(appointments.paymentStatus, "pending"),
        ),
      )
      .orderBy(desc(appointments.createdAt))
      .limit(100),
    db
      .select({
        id: diagnosticBookings.id,
        bookingNo: diagnosticBookings.bookingNo,
        patientName: diagnosticBookings.patientName,
        total: diagnosticBookings.total,
        paymentMethod: diagnosticBookings.paymentMethod,
        paymentStatus: diagnosticBookings.paymentStatus,
        status: diagnosticBookings.status,
        createdAt: diagnosticBookings.createdAt,
      })
      .from(diagnosticBookings)
      .where(
        and(
          ne(diagnosticBookings.status, "cancelled"),
          unpaidPaymentStatus(diagnosticBookings.paymentStatus),
        ),
      )
      .orderBy(desc(diagnosticBookings.createdAt))
      .limit(100),
  ]);

  const unpaidOrders = orderRows.map((o) => ({
    id: o.id,
    ref: o.orderNo,
    customer: o.customerName ?? "",
    amount: Number(o.total),
    method: o.paymentMethod ?? "",
    paymentStatus: o.paymentStatus ?? "pending",
    status: o.status,
    createdAt: o.createdAt,
  }));
  const unpaidAppointments = apptRows.map((a) => ({
    id: a.id,
    ref: a.invoiceNo,
    customer: a.patientName,
    amount: Number(a.fee),
    method: a.paymentMethod,
    paymentStatus: a.paymentStatus,
    status: a.status,
    createdAt: a.createdAt,
  }));
  const unpaidDiagnostics = diagRows.map((d) => ({
    id: d.id,
    ref: d.bookingNo,
    customer: d.patientName,
    amount: Number(d.total),
    method: d.paymentMethod,
    paymentStatus: d.paymentStatus,
    status: d.status,
    createdAt: d.createdAt,
  }));

  const sum = (rows: { amount: number }[]) => rows.reduce((a, r) => a + r.amount, 0);

  return NextResponse.json({
    summary: {
      ordersDue: sum(unpaidOrders),
      ordersCount: unpaidOrders.length,
      appointmentsDue: sum(unpaidAppointments),
      appointmentsCount: unpaidAppointments.length,
      diagnosticsDue: sum(unpaidDiagnostics),
      diagnosticsCount: unpaidDiagnostics.length,
      totalDue: sum(unpaidOrders) + sum(unpaidAppointments) + sum(unpaidDiagnostics),
    },
    orders: unpaidOrders,
    appointments: unpaidAppointments,
    diagnostics: unpaidDiagnostics,
  });
}
