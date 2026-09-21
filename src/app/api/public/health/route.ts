export async function GET() {
  return Response.json({
    ok: true,
    ts: Date.now(),
    stack: "next16-mysql",
  });
}
