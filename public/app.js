const form = document.querySelector("#selection-form");
const textSelect = document.querySelector("#text-id");
const textList = document.querySelector("#text-list");
const message = document.querySelector("#form-message");
const refreshButton = document.querySelector("#refresh-button");

let statusData = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function readerLine(readers) {
  if (!readers.length) return '<span class="empty">Noch niemand eingetragen.</span>';
  return readers
    .map((reader) => {
      const group = reader.groupName ? ` (${escapeHtml(reader.groupName)})` : "";
      const note = reader.isThirdSlot ? " - dritter Platz" : "";
      return `<strong>${escapeHtml(reader.studentName)}</strong>${group}${note}`;
    })
    .join("<br>");
}

function materialLink(text) {
  if (!text.materialUrl) return "";

  return `
    <p class="materials">
      <span>Infomaterial</span>
      <a href="${escapeHtml(text.materialUrl)}" target="_blank" rel="noreferrer">
        ${escapeHtml(text.materialLabel || "Material öffnen")}
      </a>
    </p>
  `;
}

function renderOptions(texts) {
  const currentValue = textSelect.value;
  textSelect.innerHTML = '<option value="">Bitte wählen</option>';

  for (const text of texts) {
    const option = document.createElement("option");
    option.value = text.id;
    option.disabled = text.isFull;
    option.textContent = text.isFull
      ? `${text.title} - voll`
      : `${text.title} (${text.readers.length}/${text.hardLimit})`;
    textSelect.append(option);
  }

  if (currentValue && [...textSelect.options].some((option) => option.value === currentValue && !option.disabled)) {
    textSelect.value = currentValue;
  }
}

function renderTexts(texts) {
  textList.innerHTML = texts
    .map((text) => {
      const stateClass = text.isFull ? "full" : text.needsAgreementForNextSlot ? "warning" : "";
      const badgeClass = text.isFull ? "full" : text.needsAgreementForNextSlot ? "warning" : "";
      const badgeText = text.isFull
        ? "voll"
        : text.needsAgreementForNextSlot
          ? "3. Platz nach Absprache"
          : `${text.regularSpotsLeft} regulär frei`;

      return `
        <article class="text-card ${stateClass}">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(text.title)}</h3>
              <p class="meta">${escapeHtml(text.author)} · ${escapeHtml(text.source)} · ${escapeHtml(text.videoLength)}</p>
            </div>
            <span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span>
          </div>
          <p class="context">${escapeHtml(text.context)}</p>
          ${materialLink(text)}
          <p class="readers">${readerLine(text.readers)}</p>
        </article>
      `;
    })
    .join("");
}

async function loadStatus() {
  const response = await fetch("/api/status", { cache: "no-store" });
  if (!response.ok) throw new Error("Status konnte nicht geladen werden.");
  statusData = await response.json();
  renderOptions(statusData.texts);
  renderTexts(statusData.texts);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;

  try {
    const formData = new FormData(form);
    const payload = {
      studentName: formData.get("studentName"),
      groupName: formData.get("groupName"),
      textId: formData.get("textId"),
      thirdSlotApproved: formData.get("thirdSlotApproved") === "on"
    };

    const response = await fetch("/api/selections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.message || "Der Eintrag konnte nicht gespeichert werden.", true);
      await loadStatus();
      return;
    }

    form.reset();
    setMessage("Gespeichert. Dein Eintrag ist jetzt reserviert und kann nicht durch andere überschrieben werden.");
    await loadStatus();
  } catch (error) {
    setMessage(error.message || "Der Eintrag konnte nicht gespeichert werden.", true);
  } finally {
    submitButton.disabled = false;
  }
});

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  try {
    await loadStatus();
    setMessage("Aktualisiert.");
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    refreshButton.disabled = false;
  }
});

loadStatus().catch((error) => setMessage(error.message, true));
