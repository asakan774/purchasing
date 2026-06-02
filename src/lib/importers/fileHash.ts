import { createHash } from "node:crypto";

export function sha256Buffer(buffer: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}
