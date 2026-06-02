import { NextResponse } from "next/server";
import { commitImport } from "@/lib/importers/commit";
import { ImportType } from "@/lib/importers/types";

export const runtime = "edge";
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

    const result = await commitImport(file, importType);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to commit import.",
        details:
          error && typeof error === "object" && "details" in error
            ? (error as { details?: unknown }).details
            : undefined,
        code:
          error && typeof error === "object" && "code" in error
            ? (error as { code?: unknown }).code
            : undefined
      },
      { status: 500 }
    );
  }
}

function isImportType(value: FormDataEntryValue | null): value is ImportType {
  return value === "PO" || value === "WO" || value === "VENDOR";
}
