import { NextResponse } from "next/server";
import { getPoFilterOptions } from "@/lib/search/queries";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filters = await getPoFilterOptions();
    return NextResponse.json(filters);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load PO filters." },
      { status: 500 }
    );
  }
}
