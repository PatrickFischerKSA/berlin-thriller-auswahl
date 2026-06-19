import { buildStatus, createSelection, normalizeName, publicEntry } from "./selectionStore.mjs";
import { texts } from "./texts.mjs";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

async function readEntries(db) {
  const { results } = await db
    .prepare(
      `select id, text_id, student_name, group_name, is_third_slot, created_at
       from selections
       order by created_at asc`
    )
    .all();

  return results.map((row) =>
    publicEntry({
      id: row.id,
      textId: row.text_id,
      studentName: row.student_name,
      groupName: row.group_name,
      isThirdSlot: Boolean(row.is_third_slot),
      createdAt: row.created_at
    })
  );
}

async function createD1Selection(db, payload) {
  const currentEntries = await readEntries(db);
  const selection = createSelection({ texts, entries: currentEntries, payload });

  if (!selection.ok) {
    return selection;
  }

  const entry = selection.entry;
  const studentNameNorm = normalizeName(entry.studentName).toLocaleLowerCase("de-CH");

  try {
    const insertResult = await db
      .prepare(
        `insert into selections (
          id,
          text_id,
          student_name,
          student_name_norm,
          group_name,
          is_third_slot,
          third_slot_approved,
          created_at
        )
        select
          ?1,
          ?2,
          ?3,
          ?4,
          ?5,
          case when (select count(*) from selections where text_id = ?2) >= 2 then 1 else 0 end,
          ?6,
          ?7
        where (select count(*) from selections where text_id = ?2) < 3
          and (
            (select count(*) from selections where text_id = ?2) < 2
            or ?6 = 1
          )`
      )
      .bind(
        entry.id,
        entry.textId,
        entry.studentName,
        studentNameNorm,
        entry.groupName,
        payload.thirdSlotApproved ? 1 : 0,
        entry.createdAt
      )
      .run();

    if (insertResult.meta?.changes === 0) {
      const readers = currentEntries.filter((currentEntry) => currentEntry.textId === entry.textId);
      if (readers.length >= 3) {
        return { ok: false, status: 409, message: "Dieser Text ist bereits voll belegt." };
      }
      return {
        ok: false,
        status: 409,
        message: "Der dritte Platz ist nur nach Absprache gedacht. Bitte bestätige die Absprache."
      };
    }

    const saved = await db.prepare("select * from selections where id = ?1").bind(entry.id).first();
    return {
      ok: true,
      entry: publicEntry({
        id: saved.id,
        textId: saved.text_id,
        studentName: saved.student_name,
        groupName: saved.group_name,
        isThirdSlot: Boolean(saved.is_third_slot),
        createdAt: saved.created_at
      })
    };
  } catch (error) {
    const message = String(error?.message || "");

    if (message.includes("UNIQUE")) {
      return {
        ok: false,
        status: 409,
        message: "Für diesen Namen gibt es bereits einen Eintrag. Bestehende Einträge werden nicht überschrieben."
      };
    }

    return { ok: false, status: 500, message: "Der Eintrag konnte nicht gespeichert werden." };
  }
}

async function parseBody(request) {
  const text = await request.text();
  if (text.length > 20_000) {
    throw new Error("Anfrage zu groß.");
  }
  return text ? JSON.parse(text) : {};
}

async function handleApi(request, env) {
  const url = new URL(request.url);

  if (!env.DB) {
    return json({ message: "D1-Datenbank ist nicht konfiguriert." }, 500);
  }

  if (request.method === "GET" && url.pathname === "/api/status") {
    const entries = await readEntries(env.DB);
    return json({
      title: "Topographie des Verbrechens - Berlin-Thriller",
      assignment: "Webspecial mit einem in Berlin vor Ort gedrehten Video",
      texts: buildStatus(texts, entries)
    });
  }

  if (request.method === "GET" && url.pathname === "/api/export") {
    const entries = await readEntries(env.DB);
    return json({
      exportedAt: new Date().toISOString(),
      entries,
      texts: buildStatus(texts, entries)
    });
  }

  if (request.method === "POST" && url.pathname === "/api/selections") {
    try {
      const payload = await parseBody(request);
      const result = await createD1Selection(env.DB, payload);

      if (!result.ok) {
        return json({ message: result.message }, result.status);
      }

      return json({ entry: result.entry }, 201);
    } catch (error) {
      return json({ message: error.message || "Der Eintrag konnte nicht gespeichert werden." }, 400);
    }
  }

  return json({ message: "Nicht gefunden." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
