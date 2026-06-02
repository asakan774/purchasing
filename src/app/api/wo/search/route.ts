import { NextResponse } from "next/server";
import { searchWoDocuments } from "@/lib/search/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rows = await searchWoDocuments({
      q: url.searchParams.get("q") ?? "",
      year: url.searchParams.get("year") ?? "",
      department: url.searchParams.get("department") ?? "",
      supplier: url.searchParams.get("supplier") ?? "",
      dateFrom: url.searchParams.get("dateFrom") ?? "",
      dateTo: url.searchParams.get("dateTo") ?? ""
    });
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search WO." },
      { status: 500 }
    );
  }
}
