// src/lib/i18n/englishOnly.ts
// Messages that are English-only for now (TikTok is English-first: its guides and landing page
// have no translated copies yet). They are extracted into templates.json like every message, so
// they're recognised, but translated pages show them in English until they are translated.
// src/lib/i18n/dictionaries.test.ts skips these when it checks that every template is translated.

export const ENGLISH_ONLY_MESSAGE_TEMPLATES = [
  "{0} item(s) have no image. TikTok requires image_link for every product.",
  "{0} item(s) have no price. TikTok requires a price for every product.",
  "{0} item(s) have no brand. TikTok requires a brand on every product; use your own brand for products you make.",
];
