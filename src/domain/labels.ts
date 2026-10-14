const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'via', 'with',
]);

/**
 * Turn a kebab-case concept slug into a readable label.
 * "model-driven-vs-preconfigured" -> "Model Driven vs Preconfigured"
 * Keeps well-known proper nouns intact where the deck used them.
 */
export function humanizeConcept(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      // Preserve acronyms the author wrote in caps (e.g. "mcp", "claude" -> "MCP")
      if (/^[A-Z0-9]+$/.test(w) && w.length <= 4) return w.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}