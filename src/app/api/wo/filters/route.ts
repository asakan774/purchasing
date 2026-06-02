import { NextResponse } from "next/server";
import { getWoFilterOptions } from "@/lib/search/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filters = await getWoFilterOptions();
    return NextResponse.json(filters);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load WO filters." },
      { status: 500 }
    );
  }
}
