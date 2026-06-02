import { createServiceClient } from "@/lib/supabase/server";
import { parseMangoWorkbook } from "./mangoWorkbook";
import { sha256Buffer } from "./fileHash";
import { ImportType } from "./types";

export async function previewImport(file: File, importType: ImportType) {
  const buffer = await file.arrayBuffer();
  const parsed = await parseMangoWorkbook(buffer, importType);
  const fileHash = await sha256Buffer(buffer);
  const supabase = createServiceClient();

  const keys = parsed.rows.map((row) => row.sourceKey);
  const existingKeys = await fetchExistingKeys(supabase, importType, keys);
  const seen = new Set<string>();

  const rows = parsed.rows.map((row) => {
    const duplicateInFile = seen.has(row.sourceKey);
    seen.add(row.sourceKey);
    return {
      ...row,
      importStatus: duplicateInFile ? "conflict" : existingKeys.has(row.sourceKey) ? "existing" : "new"
    };
  });

  return {
    importType,
    sourceReport: parsed.sourceReport,
    fileName: file.name,
    fileHash,
    stats: {
      ...parsed.stats,
      existingRows: rows.filter((row) => row.importStatus === "existing").length,
      newRows: rows.filter((row) => row.importStatus === "new").length,
      conflictRows: rows.filter((row) => row.importStatus === "conflict").length
    },
    rows
  };
}

async function fetchExistingKeys(
  supabase: ReturnType<typeof createServiceClient>,
  importType: ImportType,
  keys: string[]
) {
  if (keys.length === 0) return new Set<string>();

  if (importType === "PO") {
    const pairs = keys.map((key) => {
      const [poNo, lineNo] = key.split("::");
      return { poNo, lineNo: Number(lineNo) };
    });
    const poNumbers = [...new Set(pairs.map((pair) => pair.poNo))];
    const { data, error } = await supabase
      .from("po_items")
      .select("po_no,line_no")
      .in("po_no", poNumbers);
    if (error) throw error;
    return new Set((data ?? []).map((row) => `${row.po_no}::${row.line_no}`));
  }

  if (importType === "WO") {
    const { data, error } = await supabase.from("wo_documents").select("wo_no").in("wo_no", keys);
    if (error) throw error;
    return new Set((data ?? []).map((row) => row.wo_no));
  }

  const { data, error } = await supabase.from("suppliers").select("vendor_code").in("vendor_code", keys);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.vendor_code));
}
