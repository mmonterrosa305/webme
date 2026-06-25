import * as cheerio from "cheerio";
import type { Element } from "domhandler";

import type { GoogleReview } from "@/lib/google-places/fetch-google-reviews";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderStars(rating: number): string {
  const filled = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return `${filled}${empty}`;
}

function buildReviewCards(reviews: GoogleReview[]): string {
  return reviews
    .map(
      (review) => `
    <article class="testimonial-card webme-google-review-card">
      <div class="stars" aria-label="${review.rating} out of 5 stars">${renderStars(review.rating)}</div>
      <p class="testimonial-text">"${escapeHtml(review.text)}"</p>
      <p class="testimonial-author">${escapeHtml(review.authorName)}</p>
      ${
        review.publishedAt
          ? `<p class="webme-review-date">${escapeHtml(review.publishedAt)}</p>`
          : ""
      }
    </article>`,
    )
    .join("");
}

const GOOGLE_REVIEWS_SECTION_STYLES = `<style id="webme-google-reviews-styles">
#google-reviews.webme-google-reviews {
  padding: 80px 5%;
}
#google-reviews .container {
  max-width: 1200px;
  margin: 0 auto;
}
#google-reviews h2 {
  text-align: center;
  margin-bottom: 2rem;
}
#google-reviews .testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
#google-reviews .webme-google-review-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 1.5rem;
}
#google-reviews .stars {
  color: #fbbf24;
  font-size: 1.1rem;
  letter-spacing: 0.08em;
  margin-bottom: 0.75rem;
}
#google-reviews .testimonial-text {
  font-style: italic;
  line-height: 1.7;
  margin-bottom: 1rem;
}
#google-reviews .testimonial-author {
  font-weight: 600;
  margin-bottom: 0.25rem;
}
#google-reviews .webme-review-date {
  font-size: 0.875rem;
  opacity: 0.75;
}
</style>`;

function findContactSection($: cheerio.CheerioAPI): cheerio.Cheerio<Element> {
  const byId = $("#contact").first();
  if (byId.length) {
    return byId;
  }

  return $("section")
    .filter((_index, element) => {
      return $(element).find('[data-webme="phone"]').length > 0;
    })
    .first();
}

function removeDuplicateReviewSections($: cheerio.CheerioAPI): void {
  $("#google-reviews, [data-webme='google-reviews']").remove();

  $("section#testimonials, section.testimonials").each((_index, element) => {
    const $section = $(element);
    if ($section.attr("data-webme") === "google-reviews") {
      return;
    }
    $section.remove();
  });
}

export function hasGoogleReviewsSection(html: string): boolean {
  return (
    html.includes('id="google-reviews"') ||
    html.includes('data-webme="google-reviews"')
  );
}

export function injectGoogleReviewsSection(
  html: string,
  reviews: GoogleReview[],
): string {
  if (!reviews.length) {
    return html;
  }

  const $ = cheerio.load(html);
  removeDuplicateReviewSections($);

  const cardsHtml = buildReviewCards(reviews);
  const sectionHtml = `${GOOGLE_REVIEWS_SECTION_STYLES}
<section id="google-reviews" class="section testimonials webme-google-reviews" data-webme="google-reviews">
  <div class="container">
    <h2>What Our Customers Say</h2>
    <div class="testimonials-grid">
      ${cardsHtml}
    </div>
  </div>
</section>`;

  const $contact = findContactSection($);

  if ($contact.length) {
    $contact.before(sectionHtml);
  } else if ($("footer").length) {
    $("footer").first().before(sectionHtml);
  } else {
    $("body").append(sectionHtml);
  }

  return $.html();
}
