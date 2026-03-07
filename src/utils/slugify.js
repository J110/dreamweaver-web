/**
 * URL slug utilities for SEO-friendly story/category URLs.
 */

/**
 * Convert a story title to a URL-friendly slug.
 * e.g., "Mira and the Whispering Fireflies" → "mira-and-the-whispering-fireflies"
 */
export function generateSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/['']/g, '')           // Remove apostrophes/smart quotes
    .replace(/[^\w\s-]/g, '')       // Remove special characters
    .replace(/\s+/g, '-')           // Spaces to hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-|-$/g, '');         // Trim leading/trailing hyphens
}

/**
 * Find a story by its URL slug in an array of stories.
 * Matches by generating a slug from each story's title.
 */
export function findStoryBySlug(slug, stories) {
  if (!slug || !stories) return null;
  return stories.find((s) => generateSlug(s.title) === slug) || null;
}

/**
 * Category slug mapping (theme IDs to URL-friendly slugs and display names).
 */
export const CATEGORY_MAP = {
  ocean:       { theme: 'ocean',      display: 'Ocean',       seoTitle: 'Ocean Bedtime Stories for Kids' },
  adventure:   { theme: 'adventure',  display: 'Adventure',   seoTitle: 'Adventure Bedtime Stories for Kids' },
  animals:     { theme: 'animals',    display: 'Animals',     seoTitle: 'Animal Bedtime Stories for Kids' },
  space:       { theme: 'space',      display: 'Space',       seoTitle: 'Space Bedtime Stories for Kids' },
  'fairy-tales': { theme: 'fairy_tale', display: 'Fairy Tales', seoTitle: 'Fairy Tale Bedtime Stories for Kids' },
  nature:      { theme: 'nature',     display: 'Nature',      seoTitle: 'Nature Bedtime Stories for Kids' },
  fantasy:     { theme: 'fantasy',    display: 'Fantasy',     seoTitle: 'Fantasy Bedtime Stories for Kids' },
  bedtime:     { theme: 'bedtime',    display: 'Bedtime',     seoTitle: 'Calming Bedtime Stories for Sleep' },
  dreamy:      { theme: 'dreamy',     display: 'Dreamy',      seoTitle: 'Dreamy Bedtime Stories for Kids' },
  friendship:  { theme: 'friendship', display: 'Friendship',  seoTitle: 'Friendship Bedtime Stories for Kids' },
  family:      { theme: 'family',     display: 'Family',      seoTitle: 'Family Bedtime Stories for Kids' },
  mystery:     { theme: 'mystery',    display: 'Mystery',     seoTitle: 'Mystery Bedtime Stories for Kids' },
  science:     { theme: 'science',    display: 'Science',     seoTitle: 'Science Bedtime Stories for Kids' },
};

/**
 * Age range mapping for age filter pages.
 */
export const AGE_RANGES = {
  '0-1':  { min: 0, max: 1,  display: 'Babies (0-1)',       seoTitle: 'Bedtime Stories for Babies' },
  '2-5':  { min: 2, max: 5,  display: 'Toddlers (Ages 2-5)', seoTitle: 'Bedtime Stories for Toddlers (Ages 2-5)' },
  '6-8':  { min: 6, max: 8,  display: 'Kids (Ages 6-8)',     seoTitle: 'Bedtime Stories for Kids Ages 6-8' },
  '9-12': { min: 9, max: 12, display: 'Older Kids (Ages 9-12)', seoTitle: 'Bedtime Stories for Older Kids (Ages 9-12)' },
};
