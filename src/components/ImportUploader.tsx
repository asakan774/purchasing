"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";

type ImportType = "PO" | "WO" | "VENDOR";

export function ImportUploader() {
  const [importType, setImportType] = useState<ImportType>("PO");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(endpoint: "preview" | "commit") {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("importType", importType);
    form.set("file", file);
    const response = await fetch(`/api/imports/${endpoint}`, { method: "POST", body: form });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage([result.error, result.code, result.details].filter(Boolean).join(" | ") || "Import failed.");
      return;
    }
    if (endpoint === "preview") {
      setPreview(result);
    } else {
      setMessage(`Committed ${result.stats.parsedRows} rows. Batch ${result.batchId}`);
    }
  }

  return (
    <section className="import-panel">
      <div className="panel-header">
        <div>
          <h1>Monthly Mango Import</h1>
          <p>Upload PO, WO, or vendor Excel exports. Preview checks existing keys before commit.</p>
        </div>
      </div>

      <div className="import-grid">
        <label>
          Import type
          <select value={importType} onChange={(event) => setImportType(event.target.value as ImportType)}>
            <option value="PO">PO report</option>
            <option value="WO">WO report</option>
            <option value="VENDOR">Vendor master</option>
          </select>
        </label>
        <label>
          Excel or CSV file
          <input type="file" accept=".xlsx,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <div className="actions">
          <button type="button" onClick={() => submit("preview")} disabled={!file || busy}>
            {busy ? <Loader2 size={17} className="spin" /> : <FileUp size={17} />}
            Preview
          </button>
          <button type="button" onClick={() => submit("commit")} disabled={!file || busy || !preview}>
            <CheckCircle2 size={17} />
            Commit
          </button>
        </div>
      </div>

      {preview ? (
        <div className="summary-row">
          <Metric label="Parsed" value={preview.stats.parsedRows} />
          <Metric label="New" value={preview.stats.newRows} />
          <Metric label="Existing" value={preview.stats.existingRows} />
          <Metric label="Conflicts" value={preview.stats.conflictRows} />
          <Metric label="Invalid" value={preview.stats.invalidRows} />
        </div>
      ) : null}

      {message ? <p className="notice">{message}</p> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value.toLocaleString("th-TH")}</strong>
    </div>
  );
}
