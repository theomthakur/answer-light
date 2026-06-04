import fs from "node:fs";
import path from "node:path";
import { Complaint } from "./schemas";

/**
 * Loads the shipped, human-verified complaint fixtures from data/complaints/*.json
 * and validates them against the Zod schema at read time, so a malformed fixture
 * fails loudly rather than silently corrupting a generated Answer.
 */
const COMPLAINTS_DIR = path.join(process.cwd(), "data", "complaints");

export function listComplaints(): Complaint[] {
  if (!fs.existsSync(COMPLAINTS_DIR)) return [];
  return fs
    .readdirSync(COMPLAINTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => loadComplaintFile(path.join(COMPLAINTS_DIR, f)))
    .sort((a, b) => a.caption.documentTitle.localeCompare(b.caption.documentTitle));
}

export function getComplaint(id: string): Complaint | null {
  const file = path.join(COMPLAINTS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return loadComplaintFile(file);
}

function loadComplaintFile(file: string): Complaint {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const parsed = Complaint.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid complaint fixture ${path.basename(file)}: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}
