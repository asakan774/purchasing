import { NextResponse } from "next/server";
import { searchPoDocuments, searchPoItems } from "@/lib/search/queries";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = readSearchParams(request);
    const mode = params.mode === "item" ? "item" : "po";
    const rows = mode === "item" ? await searchPoItems(params) : await searchPoDocuments(params);
    return NextResponse.json({ mode, rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search PO." },
      { status: 500 }
    );
  }
}

function readSearchParams(request: Request) {
  const url = new URL(request.url);
  return {
    mode: url.searchParams.get("mode") ?? "po",
    q: url.searchParams.get("q") ?? "",
    year: url.searchParams.get("year") ?? "",
    department: url.searchParams.get("department") ?? "",
    category: url.searchParams.get("category") ?? "",
    supplier: url.searchParams.get("supplier") ?? "",
    dateFrom: url.searchParams.get("dateFrom") ?? "",
    dateTo: url.searchParams.get("dateTo") ?? ""
  };
}
