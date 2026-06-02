import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMangoWorkbook } from "@/lib/importers/mangoWorkbook";
import { PoItemImportRow, SupplierImportRow, WoDocumentImportRow } from "@/lib/importers/types";

const fixtures = join(process.cwd(), "tests", "fixtures");

describe("Mango workbook parser", () => {
  it("parses PO item report with stable duplicate keys", async () => {
    const file = await readFile(join(fixtures, "po-apr-2026.xlsx"));
    const result = await parseMangoWorkbook(file.buffer as ArrayBuffer, "PO");

    const rows = result.rows as PoItemImportRow[];
    expect(rows).toHaveLength(72);
    expect(result.stats.duplicateRowsInFile).toBe(0);
    expect(rows[0].sourceKey).toBe("PO2026040002::1");
    expect(rows[0].supplierName).toContain("ออฟฟิศเวิร์ค");
    expect(rows[0].departmentCode).toBe("HO");
  });

  it("parses WO document report as one row per WO", async () => {
    const file = await readFile(join(fixtures, "wo-apr-2026.xlsx"));
    const result = await parseMangoWorkbook(file.buffer as ArrayBuffer, "WO");

    const rows = result.rows as WoDocumentImportRow[];
    expect(rows).toHaveLength(15);
    expect(result.stats.duplicateRowsInFile).toBe(0);
    expect(rows[0].sourceKey).toBe("WO2026040001");
    expect(rows.some((row) => row.projectCode === "00702024")).toBe(true);
  });

  it("parses vendor master report by vendor code", async () => {
    const file = await readFile(join(fixtures, "vendors-sample.xlsx"));
    const result = await parseMangoWorkbook(file.buffer as ArrayBuffer, "VENDOR");

    const rows = result.rows as SupplierImportRow[];
    expect(rows).toHaveLength(19);
    expect(result.stats.duplicateRowsInFile).toBe(0);
    expect(rows[0].sourceKey).toBe("01050");
    expect(rows[18].phone).toBe("098-284-5441");
  });
});
