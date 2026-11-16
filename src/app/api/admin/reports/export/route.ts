import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, can } from "@/lib/auth/guards";
import { getSalesReport } from "@/lib/admin/report-queries";
import { isReportType, parseDateWindow, reportToCsv } from "@/lib/admin/reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx || !can(ctx, "orders:write")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  if (!isReportType(type)) return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  const w = parseDateWindow(sp.get("from"), sp.get("to"));
  const report = await getSalesReport(w);

  return new NextResponse(reportToCsv(report, type), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-report-${w.from}_${w.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
