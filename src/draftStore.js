// draftStore.js
// Stage 8.5a: Draft identity + overwrite via File System Access API (when available)

function supportsFSAccess() {
  return (
    typeof window !== "undefined" &&
    "showOpenFilePicker" in window &&
    "showSaveFilePicker" in window
  );
}

export function makeDraftId() {
  // Prefer crypto.randomUUID when available
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  // Fallback: good-enough unique id
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function saveDraftBytes({
  bytes,
  suggestedName,
  existingHandle = null,
}) {
  // If FS Access API is available, we can truly overwrite
  if (supportsFSAccess()) {
    const handle =
      existingHandle ||
      (await window.showSaveFilePicker({
        suggestedName: suggestedName || "document.drft",
        types: [
          {
            description: "Typeset Draft",
            accept: { "application/json": [".drft"] },
          },
        ],
      }));

    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();

    return { ok: true, handle, name: handle?.name || suggestedName || null };
  }

  // Fallback (no overwrite possible): caller should downloadBlob
  return { ok: false, reason: "NO_FS_ACCESS" };
}

export async function openDraftFile() {
  if (!supportsFSAccess()) {
    return { ok: false, reason: "NO_FS_ACCESS" };
  }

  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: "Typeset Draft",
        accept: { "application/json": [".drft"] },
      },
    ],
  });

  const file = await handle.getFile();
  const text = await file.text();
  return { ok: true, handle, fileName: file.name, text };
}
