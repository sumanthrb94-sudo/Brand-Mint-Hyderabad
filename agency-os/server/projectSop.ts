import type { ProjectRecord } from "./firebaseAgencyDb.js";

export type ProjectStage = ProjectRecord["status"];
export type SopItem = { title: string; required: boolean };

export const PROJECT_STAGES: ProjectStage[] = ["discovery", "in_progress", "client_review", "complete"];

export const STAGE_LABELS: Record<ProjectStage, string> = {
  discovery: "Discovery",
  in_progress: "In progress",
  client_review: "Client review",
  complete: "Complete",
};

/**
 * The studio's standing operating procedure, per stage.
 *
 * Taken from the checklists the studio already runs on —
 * brand-mint-admin/ops/kickoff-checklist.md and handover-checklist.md — rather
 * than invented here, so what the product enforces is what the business already
 * says it does. Required items gate the move to the next stage; optional items
 * are recorded but never block.
 *
 * Kept deliberately short. A checklist nobody finishes is a checklist nobody
 * reads, so only the steps that genuinely must not be skipped are required.
 */
export const PROJECT_SOP: Record<ProjectStage, SopItem[]> = {
  discovery: [
    { title: "Service agreement countersigned and stored", required: true },
    { title: "50% advance invoice issued and paid", required: true },
    { title: "Kickoff call held", required: true },
    { title: "Client access received — domain/DNS, hosting, analytics", required: true },
    { title: "Brand assets and voice references received", required: false },
    { title: "Engagement folder created", required: false },
    { title: "Internal kickoff brief written and shared", required: false },
    { title: "Day-1 walkthrough sent to the client", required: false },
  ],
  in_progress: [
    { title: "Weekly demo booked with the client", required: true },
    { title: "All in-scope features built", required: true },
    { title: "Catalogue and content loaded", required: false },
    { title: "Visual direction locked at the first demo", required: false },
    { title: "Open questions from kickoff resolved", required: false },
  ],
  client_review: [
    { title: "Internal QA pass — Lighthouse 90+ on all four axes", required: true },
    { title: "Mobile QA on real devices", required: true },
    { title: "Forms and checkout tested with a real submission", required: true },
    { title: "Content review — no placeholder text, images load, links resolve", required: true },
    { title: "Final 50% balance invoice issued", required: true },
    { title: "Cross-browser check", required: false },
    { title: "Accessibility pass — WCAG AA", required: false },
    { title: "DNS and SSL verified ready for switchover", required: false },
  ],
  complete: [
    { title: "Production deploy successful and smoke-tested", required: true },
    { title: "Final invoice payment confirmed received", required: true },
    { title: "Credentials handed over securely", required: true },
    { title: "Handover meeting completed", required: true },
    { title: "Repo and cloud accounts transferred", required: false },
    { title: "Brand kit delivered", required: false },
    { title: "30-day warranty period communicated", required: false },
    { title: "Case-study consent captured", required: false },
  ],
};

export function sopItemsForStage(stage: ProjectStage): SopItem[] {
  return PROJECT_SOP[stage] ?? [];
}

export function sopTemplate(): { stage: ProjectStage; title: string; required: boolean }[] {
  return PROJECT_STAGES.flatMap((stage) => sopItemsForStage(stage).map((item) => ({ stage, ...item })));
}

export function stageIndex(stage: ProjectStage) {
  return PROJECT_STAGES.indexOf(stage);
}

/** A move further along the pipeline. Going back is always permitted. */
export function isForwardMove(from: ProjectStage, to: ProjectStage) {
  return stageIndex(to) > stageIndex(from);
}

/**
 * The required items of `stage` that are still open. A forward move is refused
 * while this is non-empty unless the CEO explicitly overrides — leaving a stage
 * is what the checklist gates, not entering the next one.
 */
export function outstandingRequired<T extends { stage: string; title: string; required: boolean; done: boolean }>(items: T[], stage: ProjectStage): T[] {
  return items.filter((item) => item.stage === stage && item.required && !item.done);
}
