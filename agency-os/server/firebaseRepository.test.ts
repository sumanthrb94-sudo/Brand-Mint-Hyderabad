import { describe, expect, it } from "vitest";
import { fromSnapshot, recordTime, toDate } from "./firebaseRepository.js";

const snapshotOf = (data: Record<string, unknown> | undefined) => ({ id: "1", data: () => data });

describe("toDate", () => {
  it("passes through a valid Date", () => {
    const value = new Date("2026-08-14T10:00:00.000Z");
    expect(toDate(value)).toEqual(value);
  });

  it("unwraps a Firestore Timestamp", () => {
    const value = new Date("2026-08-14T10:00:00.000Z");
    expect(toDate({ toDate: () => value })).toEqual(value);
  });

  it("parses ISO strings and epoch millis", () => {
    expect(toDate("2026-08-14T10:00:00.000Z")?.toISOString()).toBe("2026-08-14T10:00:00.000Z");
    expect(toDate(1786716000000)?.getTime()).toBe(1786716000000);
  });

  it("returns null for values that cannot be a date", () => {
    for (const value of [undefined, null, "", "not a date", new Date("nope"), {}, []]) {
      expect(toDate(value)).toBeNull();
    }
  });
});

describe("recordTime", () => {
  it("sorts records without throwing on malformed timestamps", () => {
    const records = [
      { id: 1, updatedAt: undefined },
      { id: 2, updatedAt: new Date("2026-08-14T10:00:00.000Z") },
      { id: 3, updatedAt: "2026-08-14T12:00:00.000Z" },
    ];
    const sorted = [...records].sort((a, b) => recordTime(b.updatedAt) - recordTime(a.updatedAt));
    expect(sorted.map((record) => record.id)).toEqual([3, 2, 1]);
  });
});

describe("fromSnapshot", () => {
  it("guarantees Date timestamps even when the stored document is malformed", () => {
    const record = fromSnapshot<{ id: number; createdAt: Date; updatedAt: Date }>(
      snapshotOf({ id: 7, createdAt: "2026-08-14T10:00:00.000Z", updatedAt: undefined }),
    );
    expect(record?.createdAt).toBeInstanceOf(Date);
    // A document with no updatedAt falls back to createdAt rather than throwing
    // when a caller sorts on it.
    expect(record?.updatedAt.toISOString()).toBe("2026-08-14T10:00:00.000Z");
  });

  it("falls back to the epoch when no timestamp is usable", () => {
    const record = fromSnapshot<{ id: number; createdAt: Date; updatedAt: Date }>(snapshotOf({ id: 8 }));
    expect(record?.createdAt.getTime()).toBe(0);
    expect(record?.updatedAt.getTime()).toBe(0);
  });

  it("still returns undefined for a missing document", () => {
    expect(fromSnapshot(snapshotOf(undefined))).toBeUndefined();
  });
});
