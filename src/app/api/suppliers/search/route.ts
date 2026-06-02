import { NextResponse } from "next/server";
import { searchSuppliers } from "@/lib/search/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const rows = await searchSuppliers({ q });
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search suppliers." },
      { status: 500 }
    );
  }
}
