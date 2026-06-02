import { NextResponse } from "next/server";
import { previewImport } from "@/lib/importers/preview";
import { ImportType } from "@/lib/importers/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const importType = form.get("importType");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing upload file." }, { status: 400 });
    }
    if (!isImportType(importType)) {
      return NextResponse.json({ error: "Invalid import type." }, { status: 400 });
    }

    const preview = await previewImport(file, importType);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to preview import." },
      { status: 500 }
    );
  }
}

function isImportType(value: FormDataEntryValue | null): value is ImportType {
  return value === "PO" || value === "WO" || value === "VENDOR";
}
