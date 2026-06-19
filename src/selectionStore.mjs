export const REGULAR_LIMIT = 2;
export const HARD_LIMIT = 3;

export function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function publicEntry(entry) {
  return {
    id: entry.id,
    textId: entry.textId,
    studentName: entry.studentName,
    groupName: entry.groupName || "",
    createdAt: entry.createdAt,
    isThirdSlot: Boolean(entry.isThirdSlot)
  };
}

export function buildStatus(texts, entries) {
  return texts.map((text) => {
    const readers = entries.filter((entry) => entry.textId === text.id).map(publicEntry);
    return {
      ...text,
      readers,
      regularLimit: REGULAR_LIMIT,
      hardLimit: HARD_LIMIT,
      spotsLeft: Math.max(0, HARD_LIMIT - readers.length),
      regularSpotsLeft: Math.max(0, REGULAR_LIMIT - readers.length),
      isFull: readers.length >= HARD_LIMIT,
      needsAgreementForNextSlot: readers.length >= REGULAR_LIMIT && readers.length < HARD_LIMIT
    };
  });
}

export function createSelection({ texts, entries, payload, now = new Date(), idFactory = () => crypto.randomUUID() }) {
  const textId = String(payload.textId || "");
  const studentName = normalizeName(payload.studentName);
  const groupName = normalizeName(payload.groupName);
  const thirdSlotApproved = Boolean(payload.thirdSlotApproved);

  if (!texts.some((text) => text.id === textId)) {
    return { ok: false, status: 400, message: "Dieser Text existiert nicht." };
  }

  if (studentName.length < 2) {
    return { ok: false, status: 400, message: "Bitte gib deinen Namen an." };
  }

  const duplicateName = entries.find(
    (entry) => normalizeName(entry.studentName).toLocaleLowerCase("de-CH") === studentName.toLocaleLowerCase("de-CH")
  );
  if (duplicateName) {
    return {
      ok: false,
      status: 409,
      message: "Für diesen Namen gibt es bereits einen Eintrag. Bestehende Einträge werden nicht überschrieben."
    };
  }

  const readersForText = entries.filter((entry) => entry.textId === textId);
  if (readersForText.length >= HARD_LIMIT) {
    return { ok: false, status: 409, message: "Dieser Text ist bereits voll belegt." };
  }

  if (readersForText.length >= REGULAR_LIMIT && !thirdSlotApproved) {
    return {
      ok: false,
      status: 409,
      message: "Der dritte Platz ist nur nach Absprache gedacht. Bitte bestätige die Absprache."
    };
  }

  const entry = {
    id: idFactory(),
    textId,
    studentName,
    groupName,
    isThirdSlot: readersForText.length >= REGULAR_LIMIT,
    createdAt: now.toISOString()
  };

  return { ok: true, entry, entries: [...entries, entry] };
}
