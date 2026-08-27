/**
 * Real client reviews. This file is deliberately empty.
 *
 * Do not add a testimonial that a client has not actually given you in writing.
 * An invented quote on a pricing page is a fabricated record, it is the single
 * easiest thing for a prospect to catch, and it undoes every honest number the
 * campaign has published. The section below simply does not render while this
 * array is empty, which is the correct state until a client has said something.
 *
 * How to fill it:
 *   1. Ask at handover — see the prompt in the client portal, which appears the
 *      moment a project reaches "complete".
 *   2. Paste their words verbatim. Trim for length only, never for meaning.
 *   3. Get permission for the name and company. "R.K., Hyderabad" is fine if
 *      they would rather not be named; an unattributed quote is worth nothing.
 *   4. `date` is when they said it, ISO format. It goes into the structured
 *      data, and a review dated in the future is a red flag to Google.
 */

export type Review = {
  quote: string;
  author: string;
  company?: string;
  role?: string;
  /** ISO date, e.g. "2026-03-14" */
  date: string;
  /** 1–5. Omit rather than guess. */
  rating?: number;
};

export const reviews: Review[] = [];
