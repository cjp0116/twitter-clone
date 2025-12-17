/**
 * Extract hashtags from text
 * @param text The text to extract hashtags from
 * @returns Array of unique hashtags (lowercase, without the # symbol)
 */
export function extractHashtags(text: string): string[] {
  // Match hashtags: # followed by alphanumeric characters and underscores
  // Must not be preceded by alphanumeric characters (to avoid matching mid-word)
  const hashtagRegex = /(?:^|\s)#([A-Za-z0-9_]+)/g
  const matches = text.matchAll(hashtagRegex)

  const hashtags = new Set<string>()
  for (const match of matches) {
    // Convert to lowercase for consistency
    const tag = match[1].toLowerCase()
    // Only add if it's not empty and not too long
    if (tag.length > 0 && tag.length <= 100) {
      hashtags.add(tag)
    }
  }

  return Array.from(hashtags)
}

/**
 * Check if a string is a valid hashtag
 * @param tag The tag to validate (without the # symbol)
 * @returns True if valid
 */
export function isValidHashtag(tag: string): boolean {
  // Must be 1-100 characters, alphanumeric and underscores only
  return /^[A-Za-z0-9_]{1,100}$/.test(tag)
}

/**
 * Normalize hashtag for storage (lowercase, trimmed)
 * @param tag The tag to normalize
 * @returns Normalized tag
 */
export function normalizeHashtag(tag: string): string {
  return tag.toLowerCase().trim()
}
