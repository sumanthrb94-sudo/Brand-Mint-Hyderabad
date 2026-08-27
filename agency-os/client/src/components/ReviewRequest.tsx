import { Button } from "@/components/ui/button";
import { CONVERSIONS, track } from "@/lib/analytics";
import { Star } from "lucide-react";

/**
 * Ask for the review at the only moment it is ever easy to get: the project is
 * finished and the client is looking at the finished thing.
 *
 * Asking by email a fortnight later is how agencies end up with no reviews.
 *
 * Set VITE_REVIEW_URL to your Google Business review link
 * (https://g.page/r/…/review). Without it this renders nothing rather than a
 * dead button.
 */
const REVIEW_URL = import.meta.env.VITE_REVIEW_URL as string | undefined;

export function ReviewRequest({ hasCompletedProject }: { hasCompletedProject: boolean }) {
  if (!REVIEW_URL || !hasCompletedProject) return null;

  return (
    <section className="mt-5 rounded-2xl border border-[#cfe7d8] bg-[#f2fbf5] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-lg">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0d8855]">
            <Star className="h-4 w-4" aria-hidden="true" />
            One small favour
          </div>
          <h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">
            Your store is live. Would you say so publicly?
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#557268]">
            Two lines is plenty — what you needed, and whether you got it. It takes a minute
            and it is the single most useful thing you can do for us.
          </p>
        </div>
        <Button
          asChild
          className="bg-[#0d8855] text-white hover:bg-[#0a6f45]"
          onClick={() => track(CONVERSIONS.review_click)}
        >
          <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer">
            Leave a review
          </a>
        </Button>
      </div>
    </section>
  );
}
