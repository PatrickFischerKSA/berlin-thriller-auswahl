import test from "node:test";
import assert from "node:assert/strict";
import { createSelection } from "../src/selectionStore.mjs";

const texts = [{ id: "a", title: "A" }];

test("creates a first selection", () => {
  const result = createSelection({
    texts,
    entries: [],
    payload: { textId: "a", studentName: "Ada Lovelace" },
    now: new Date("2026-01-01T10:00:00Z")
  });

  assert.equal(result.ok, true);
  assert.equal(result.entry.studentName, "Ada Lovelace");
  assert.equal(result.entry.isThirdSlot, false);
});

test("does not overwrite an existing student entry", () => {
  const entries = [
    {
      id: "1",
      textId: "a",
      studentName: "Ada Lovelace",
      createdAt: "2026-01-01T10:00:00Z"
    }
  ];
  const result = createSelection({
    texts,
    entries,
    payload: { textId: "a", studentName: " ada   lovelace " }
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
});

test("requires agreement for the third slot", () => {
  const entries = [
    { id: "1", textId: "a", studentName: "Anna", createdAt: "2026-01-01T10:00:00Z" },
    { id: "2", textId: "a", studentName: "Ben", createdAt: "2026-01-01T10:01:00Z" }
  ];
  const result = createSelection({
    texts,
    entries,
    payload: { textId: "a", studentName: "Cem" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
});

test("blocks a fourth reader", () => {
  const entries = [
    { id: "1", textId: "a", studentName: "Anna", createdAt: "2026-01-01T10:00:00Z" },
    { id: "2", textId: "a", studentName: "Ben", createdAt: "2026-01-01T10:01:00Z" },
    { id: "3", textId: "a", studentName: "Cem", createdAt: "2026-01-01T10:02:00Z", isThirdSlot: true }
  ];
  const result = createSelection({
    texts,
    entries,
    payload: { textId: "a", studentName: "Dana", thirdSlotApproved: true }
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
});
