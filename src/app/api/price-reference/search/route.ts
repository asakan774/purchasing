import { NextResponse } from "next/server";
import { searchPriceReference } from "@/lib/search/queries";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rows = await searchPriceReference({
      q: url.searchParams.get("q") ?? "",
      year: url.searchParams.get("year") ?? "",
      category: url.searchParams.get("category") ?? ""
    });
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search price reference." },
      { status: 500 }
    );
  }
}
