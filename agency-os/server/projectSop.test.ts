import { describe, expect, it } from "vitest";
import { isForwardMove, outstandingRequired, PROJECT_SOP, PROJECT_STAGES, sopTemplate, stageIndex } from "./projectSop";

const item = (stage: string, title: string, required: boolean, done: boolean) => ({ stage, title, required, done });

describe("the SOP template", () => {
  it("covers every stage and marks the steps that must not be skipped", () => {
    for (const stage of PROJECT_STAGES) {
      const items = PROJECT_SOP[stage];
      expect(items.length, `${stage} has no steps`).toBeGreaterThan(0);
      expect(items.some((entry) => entry.required), `${stage} has no required step`).toBe(true);
    }
  });

  it("produces a flat seedable list with no duplicate titles inside a stage", () => {
    const template = sopTemplate();
    expect(template.length).toBe(Object.values(PROJECT_SOP).flat().length);
    for (const stage of PROJECT_STAGES) {
      const titles = template.filter((entry) => entry.stage === stage).map((entry) => entry.title);
      expect(new Set(titles).size, `${stage} repeats a step`).toBe(titles.length);
    }
  });

  it("carries the money steps the studio's checklists insist on", () => {
    // The advance gates the build starting and the balance gates handover;
    // these are the two the business cannot afford to have optional.
    expect(PROJECT_SOP.discovery.find((entry) => entry.title.includes("advance"))?.required).toBe(true);
    expect(PROJECT_SOP.complete.find((entry) => entry.title.includes("payment confirmed"))?.required).toBe(true);
  });
});

describe("stage movement", () => {
  it("orders the stages and identifies a forward move", () => {
    expect(stageIndex("discovery")).toBe(0);
    expect(stageIndex("complete")).toBe(3);
    expect(isForwardMove("discovery", "in_progress")).toBe(true);
    expect(isForwardMove("client_review", "complete")).toBe(true);
    expect(isForwardMove("complete", "discovery")).toBe(false);
    expect(isForwardMove("in_progress", "in_progress")).toBe(false);
  });
});

describe("what blocks leaving a stage", () => {
  const checklist = [
    item("discovery", "Advance paid", true, false),
    item("discovery", "Kickoff call held", true, true),
    item("discovery", "Brand assets received", false, false),
    item("in_progress", "All features built", true, false),
  ];

  it("reports only the current stage's unfinished required steps", () => {
    const outstanding = outstandingRequired(checklist, "discovery");
    expect(outstanding.map((entry) => entry.title)).toEqual(["Advance paid"]);
  });

  it("ignores optional steps entirely", () => {
    const done = checklist.map((entry) => (entry.required ? { ...entry, done: true } : entry));
    expect(outstandingRequired(done, "discovery")).toEqual([]);
  });

  it("does not let a later stage's steps block the current one", () => {
    // "All features built" belongs to in_progress and must not hold up the
    // move out of discovery.
    expect(outstandingRequired(checklist, "discovery").some((entry) => entry.stage === "in_progress")).toBe(false);
  });
});
