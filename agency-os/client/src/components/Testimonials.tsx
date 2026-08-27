import { reviews } from "@/data/reviews";
import { Quote } from "lucide-react";

/**
 * Client reviews, with the structured data that lets Google show them.
 *
 * Renders nothing at all when there are no reviews — an empty "What our
 * clients say" heading above blank space is worse than not having the section,
 * and a placeholder testimonial is worse than both.
 *
 * The JSON-LD is emitted only alongside visible reviews. Marking up a review
 * that a visitor cannot see on the page is against Google's structured data
 * guidelines and risks a manual action, so the two are kept in lockstep here
 * rather than being separate concerns.
 */
export function Testimonials() {
  if (reviews.length === 0) return null;

  const rated = reviews.filter(r => typeof r.rating === "number");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Brand Mint",
    address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressCountry: "IN" },
    ...(rated.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (rated.reduce((n, r) => n + r.rating!, 0) / rated.length).toFixed(1),
            reviewCount: rated.length,
          },
        }
      : {}),
    review: reviews.map(r => ({
      "@type": "Review",
      reviewBody: r.quote,
      datePublished: r.date,
      author: { "@type": "Person", name: r.author },
      ...(r.rating ? { reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 } } : {}),
    })),
  };

  return (
    <section className="public-section public-container" id="reviews">
      <div className="public-section-intro">
        <p className="public-kicker">In their words</p>
        <h2>What the people who <em>paid for it</em> say.</h2>
      </div>
      <div className="ecom-tier-grid">
        {reviews.map(r => (
          <figure key={`${r.author}-${r.date}`} className="ecom-tier">
            <Quote className="h-5 w-5" aria-hidden="true" />
            <blockquote className="ecom-tier-intro">{r.quote}</blockquote>
            <figcaption className="ecom-tier-price">
              <strong>{r.author}</strong>
              <span>{[r.role, r.company].filter(Boolean).join(" · ")}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
