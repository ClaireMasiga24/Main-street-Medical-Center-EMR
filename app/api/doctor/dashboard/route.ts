import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { loadDashboardLegacy, type DashboardPayload } from "./legacy";

/**
 * GET /api/doctor/dashboard
 *
 * This is the heaviest endpoint in the app: the doctor's queue, seven stat
 * counts, the per-patient lab / imaging / appointment roll-up, the "sent away,
 * not finished" list and the last 24h of clinical updates. It used to gather
 * all of that with six to eight separate statements, and because the database
 * is a long round trip away each statement paid the full network latency —
 * 8-10s per poll, which is what pushed the Doctor screen past its own timeout
 * and put the red banner on it.
 *
 * All of it now comes from public.doctor_dashboard()
 * (prisma/migrations/20250323000000_doctor_dashboard_rpc), which returns the
 * whole payload as one jsonb document. One round trip. The response shape is
 * byte-for-byte what the page already consumed.
 *
 * The function is called as a plain SQL statement rather than through PostgREST
 * or a generated client, which is also why the migration revokes the default
 * PUBLIC EXECUTE grant on it.
 */

/**
 * Ask the database for the whole dashboard in one round trip.
 *
 * The jsonb is cast to text and parsed here rather than being handed straight
 * back by Prisma: it keeps the contract (JSON numbers, not BigInt) explicit and
 * means a change in how a driver maps json columns cannot silently alter what
 * the page receives.
 */
async function loadDashboardRpc(
  statusFilter: string,
  doctorId: number | null
): Promise<DashboardPayload> {
  const rows = await prisma.$queryRaw<Array<{ payload: string | null }>>(Prisma.sql`
    SELECT public.doctor_dashboard(${doctorId}::int, ${statusFilter || null}::text)::text AS payload
  `);

  const raw = rows[0]?.payload;
  if (!raw) throw new Error("doctor_dashboard() returned no payload");

  const parsed = JSON.parse(raw) as DashboardPayload;
  // A function that exists but answers with the wrong document is worse than no
  // function at all — the queue would render as an empty list with no error.
  // Treat that as a failure so the fallback below takes over.
  if (!parsed || !Array.isArray(parsed.patients) || !parsed.metrics) {
    throw new Error("doctor_dashboard() returned an unexpected payload");
  }
  return parsed;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") || "";
  const doctorIdParam = searchParams.get("doctorId");
  const parsedDoctorId = doctorIdParam ? parseInt(doctorIdParam, 10) : null;
  // `doctorId` is interpolated into a count predicate; a NaN or a negative
  // would mean "no doctor" rather than "all doctors", so normalise it to NULL
  // (= all doctors), which is what the old handler effectively did.
  const doctorId =
    parsedDoctorId !== null && Number.isInteger(parsedDoctorId) && parsedDoctorId > 0
      ? parsedDoctorId
      : null;

  try {
    return NextResponse.json(await loadDashboardRpc(statusFilter, doctorId));
  } catch (rpcErr) {
    const rpcMessage = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
    console.error("[doctor/dashboard GET] doctor_dashboard() RPC failed:", rpcMessage);
  }

  // Reached only when the RPC is unavailable — the migration has not been
  // applied yet, or the app's database role lacks EXECUTE on the function. The
  // original multi-query implementation is slower but correct, and a slow queue
  // beats no queue.
  try {
    return NextResponse.json(await loadDashboardLegacy({ statusFilter, doctorId }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err instanceof Object && "code" in err ? (err as any).code : undefined;
    const meta = err instanceof Object && "meta" in err ? (err as any).meta : undefined;
    console.error("[doctor/dashboard GET] Fallback also failed:", message);
    if (code) console.error("[doctor/dashboard GET] Error code:", code);
    if (meta?.cause) console.error("[doctor/dashboard GET] Error cause:", meta.cause);
    return NextResponse.json(
      {
        error: "Failed to load dashboard data.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
        code: process.env.NODE_ENV === "development" ? code : undefined,
      },
      { status: 500 }
    );
  }
}
