import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSelection,
  publicEntry,
  readJsonFile,
  writeJsonFile
} from "./selectionStore.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_DIR = join(__dirname, "..");

function toPublicEntry(row) {
  return publicEntry({
    id: row.id,
    textId: row.text_id ?? row.textId,
    studentName: row.student_name ?? row.studentName,
    groupName: row.group_name ?? row.groupName ?? "",
    isThirdSlot: row.is_third_slot ?? row.isThirdSlot,
    createdAt: row.created_at ?? row.createdAt
  });
}

function normalizeSupabaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

export function createStore({ textsFile, entriesFile } = {}) {
  const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    return new SupabaseStore({ supabaseUrl, supabaseKey });
  }

  return new LocalJsonStore({
    textsFile: textsFile || join(PROJECT_DIR, "data", "texts.json"),
    entriesFile: entriesFile || process.env.DATA_FILE || join(PROJECT_DIR, "data", "entries.json")
  });
}

export class LocalJsonStore {
  constructor({ textsFile, entriesFile }) {
    this.textsFile = textsFile;
    this.entriesFile = entriesFile;
    this.writeQueue = Promise.resolve();
  }

  async texts() {
    return readJsonFile(this.textsFile, []);
  }

  async entries() {
    return readJsonFile(this.entriesFile, []);
  }

  async createSelection(payload) {
    return (this.writeQueue = this.writeQueue.then(async () => {
      const texts = await this.texts();
      const entries = await this.entries();
      const selection = createSelection({ texts, entries, payload });

      if (!selection.ok) {
        return selection;
      }

      await writeJsonFile(this.entriesFile, selection.entries);
      return selection;
    }));
  }
}

export class SupabaseStore {
  constructor({ supabaseUrl, supabaseKey }) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.headers = {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      "content-type": "application/json"
    };
  }

  async texts() {
    return readJsonFile(join(PROJECT_DIR, "data", "texts.json"), []);
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.supabaseUrl}${path}`, {
      ...options,
      headers: {
        ...this.headers,
        ...(options.headers || {})
      }
    });
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : null;

    if (!response.ok) {
      const message = data?.message || data?.hint || "Supabase-Anfrage fehlgeschlagen.";
      const error = new Error(message);
      error.status = response.status;
      error.detail = data;
      throw error;
    }

    return data;
  }

  async entries() {
    const rows = await this.request(
      "/rest/v1/selections?select=id,text_id,student_name,group_name,is_third_slot,created_at&order=created_at.asc"
    );
    return rows.map(toPublicEntry);
  }

  async createSelection(payload) {
    try {
      const texts = await this.texts();
      if (!texts.some((text) => text.id === String(payload.textId || ""))) {
        return { ok: false, status: 400, message: "Dieser Text existiert nicht." };
      }

      const rows = await this.request("/rest/v1/rpc/create_selection", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          p_text_id: payload.textId,
          p_student_name: payload.studentName,
          p_group_name: payload.groupName || "",
          p_third_slot_approved: Boolean(payload.thirdSlotApproved)
        })
      });
      const entry = toPublicEntry(Array.isArray(rows) ? rows[0] : rows);
      return { ok: true, entry };
    } catch (error) {
      return {
        ok: false,
        status: error.status === 400 ? 409 : error.status || 500,
        message: error.message || "Der Eintrag konnte nicht gespeichert werden."
      };
    }
  }
}
