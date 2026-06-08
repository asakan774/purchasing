import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadDotEnvLocal();

const SOURCE_DIR = process.argv[2] ?? "c:\\Users\\user\\Desktop\\cowork\\po_attachments";
const BUCKET = "po-attachments";

const MIME_TYPES = {
  ".pdf":  "application/pdf",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`Source directory not found: ${SOURCE_DIR}`);
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Ensure bucket exists
const { data: buckets } = await supabase.storage.listBuckets();
if (!buckets?.find(b => b.name === BUCKET)) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error) { console.error("Failed to create bucket:", error.message); process.exit(1); }
  console.log(`Created bucket: ${BUCKET}`);
}

const files = readdirSync(SOURCE_DIR).filter(f => {
  const ext = extname(f).toLowerCase();
  return MIME_TYPES[ext] !== undefined;
});

console.log(`Found ${files.length} files in ${SOURCE_DIR}\n`);

let uploaded = 0;
let skipped = 0;
let failed = 0;

for (const filename of files) {
  const ext = extname(filename).toLowerCase();
  const match = filename.match(/^(.+)_(\d+)\.[^.]+$/i);
  if (!match) {
    console.warn(`  SKIP  ${filename} (unexpected filename format)`);
    skipped++;
    continue;
  }

  const poNo = match[1];
  const fileIndex = parseInt(match[2], 10);
  const mimeType = MIME_TYPES[ext];
  const storagePath = `${poNo}/${filename}`;

  const fileBuffer = await readFile(join(SOURCE_DIR, filename));

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    if (uploadError.message?.includes("already exists") || uploadError.statusCode === "409") {
      console.log(`  EXISTS ${filename}`);
      skipped++;
      continue;
    }
    console.error(`  FAIL  ${filename}: ${uploadError.message}`);
    failed++;
    continue;
  }

  const { error: dbError } = await supabase.from("po_attachments").upsert(
    { po_no: poNo, storage_path: storagePath, original_filename: filename, mime_type: mimeType, file_index: fileIndex },
    { onConflict: "storage_path" }
  );

  if (dbError) {
    console.error(`  DB    ${filename}: ${dbError.message}`);
    failed++;
  } else {
    console.log(`  OK    ${filename}`);
    uploaded++;
  }
}

console.log(`\nDone. uploaded=${uploaded}  skipped=${skipped}  failed=${failed}`);

function loadDotEnvLocal() {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
