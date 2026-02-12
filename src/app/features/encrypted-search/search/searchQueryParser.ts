/**
 * Discord-like search query parser
 * Parses queries with filters like: from:@user in:#room before:2024-01-01 has:image
 */

import { SearchQuery, ContentFilter } from '../types';

/**
 * Parse a search query string into structured filters
 *
 * Examples:
 * - "hello world" -> { text: "hello world" }
 * - "from:@user hello" -> { from: "@user:...", text: "hello" }
 * - "in:#room before:2024-01-01 has:image important" -> { in: "!room:...", before: timestamp, has: "image", text: "important" }
 */
export function parseSearchQuery(queryString: string): SearchQuery {
  const query: SearchQuery = {};
  const tokens: string[] = [];

  // Regular expressions for filters
  const filters: Record<string, RegExp> = {
    from: /from:(@[^\s]+|"[^"]+"|[^\s]+)/gi,
    mentions: /mentions:(@[^\s]+|"[^"]+"|[^\s]+)/gi,
    in: /in:(#[^\s]+|![^\s]+|"[^"]+")/gi,
    before: /before:([^\s]+)/gi,
    after: /after:([^\s]+)/gi,
    during: /during:([^\s]+)/gi,
    has: /has:([^\s]+)/gi,
    pinned: /pinned:(true|false)/gi,
  };

  let remainingQuery = queryString;

  // Extract 'from:' filter
  let match;
  while ((match = filters.from.exec(queryString)) !== null) {
    query.from = unquote(match[1]);
    remainingQuery = remainingQuery.replace(match[0], '');
  }

  // Extract 'mentions:' filter
  filters.mentions.lastIndex = 0;
  while ((match = filters.mentions.exec(queryString)) !== null) {
    query.mentions = unquote(match[1]);
    remainingQuery = remainingQuery.replace(match[0], '');
  }

  // Extract 'in:' filter
  filters.in.lastIndex = 0;
  while ((match = filters.in.exec(queryString)) !== null) {
    let roomIdentifier = unquote(match[1]);

    // If it starts with #, it's a room alias - we'll need to resolve it
    // For now, we just store it as-is
    query.in = roomIdentifier;
    remainingQuery = remainingQuery.replace(match[0], '');
  }

  // Extract 'before:' filter
  filters.before.lastIndex = 0;
  while ((match = filters.before.exec(queryString)) !== null) {
    const timestamp = parseDate(match[1]);
    if (timestamp) {
      query.before = timestamp;
      remainingQuery = remainingQuery.replace(match[0], '');
    }
  }

  // Extract 'after:' filter
  filters.after.lastIndex = 0;
  while ((match = filters.after.exec(queryString)) !== null) {
    const timestamp = parseDate(match[1]);
    if (timestamp) {
      query.after = timestamp;
      remainingQuery = remainingQuery.replace(match[0], '');
    }
  }

  // Extract 'during:' filter
  filters.during.lastIndex = 0;
  while ((match = filters.during.exec(queryString)) !== null) {
    const during = parseDuring(match[1]);
    if (during) {
      query.during = during;
      remainingQuery = remainingQuery.replace(match[0], '');
    }
  }

  // Extract 'has:' filter
  filters.has.lastIndex = 0;
  while ((match = filters.has.exec(queryString)) !== null) {
    const contentType = match[1].toLowerCase();
    if (isValidContentFilter(contentType)) {
      query.has = contentType as ContentFilter;
      remainingQuery = remainingQuery.replace(match[0], '');
    }
  }

  // Extract 'pinned:' filter
  filters.pinned.lastIndex = 0;
  while ((match = filters.pinned.exec(queryString)) !== null) {
    query.pinned = match[1].toLowerCase() === 'true';
    remainingQuery = remainingQuery.replace(match[0], '');
  }

  // Remaining text is the free-text search
  const text = remainingQuery.trim();
  if (text) {
    query.text = text;
  }

  // Default order
  query.orderBy = 'recent';

  return query;
}

/**
 * Remove quotes from a string
 */
function unquote(str: string): string {
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * Parse date string to timestamp
 * Supports formats:
 * - 2024-01-15
 * - 2024-01-15T10:30:00
 * - 15/01/2024
 * - Jan 15 2024
 */
function parseDate(dateStr: string): number | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.getTime();
  } catch {
    return null;
  }
}

/**
 * Parse 'during' filter
 * Formats:
 * - 2024 (entire year)
 * - 2024-01 (specific month)
 * - January 2024
 * - Jan 2024
 */
function parseDuring(duringStr: string): { year: number; month?: number } | null {
  // Try YYYY format
  if (/^\d{4}$/.test(duringStr)) {
    return { year: parseInt(duringStr, 10) };
  }

  // Try YYYY-MM format
  const dashMatch = duringStr.match(/^(\d{4})-(\d{1,2})$/);
  if (dashMatch) {
    return {
      year: parseInt(dashMatch[1], 10),
      month: parseInt(dashMatch[2], 10),
    };
  }

  // Try "Month YYYY" format
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const textMatch = duringStr.match(/^([a-z]+)\s+(\d{4})$/i);
  if (textMatch) {
    const monthStr = textMatch[1].toLowerCase();
    const year = parseInt(textMatch[2], 10);

    let monthIndex = monthNames.indexOf(monthStr);
    if (monthIndex === -1) {
      monthIndex = monthAbbr.indexOf(monthStr);
    }

    if (monthIndex !== -1) {
      return { year, month: monthIndex + 1 };
    }
  }

  return null;
}

/**
 * Check if content filter is valid
 */
function isValidContentFilter(filter: string): boolean {
  const validFilters: ContentFilter[] = ['image', 'video', 'audio', 'file', 'link', 'attachment'];
  return validFilters.includes(filter as ContentFilter);
}

/**
 * Serialize a SearchQuery back to string (for display/debugging)
 */
export function serializeSearchQuery(query: SearchQuery): string {
  const parts: string[] = [];

  if (query.from) parts.push(`from:${query.from}`);
  if (query.mentions) parts.push(`mentions:${query.mentions}`);
  if (query.in) parts.push(`in:${query.in}`);
  if (query.before) parts.push(`before:${new Date(query.before).toISOString().split('T')[0]}`);
  if (query.after) parts.push(`after:${new Date(query.after).toISOString().split('T')[0]}`);
  if (query.during) {
    const { year, month } = query.during;
    parts.push(`during:${year}${month ? '-' + month.toString().padStart(2, '0') : ''}`);
  }
  if (query.has) parts.push(`has:${query.has}`);
  if (query.pinned !== undefined) parts.push(`pinned:${query.pinned}`);
  if (query.text) parts.push(query.text);

  return parts.join(' ');
}

/**
 * Validate a search query
 */
export function validateSearchQuery(query: SearchQuery): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check date logic
  if (query.before && query.after && query.before <= query.after) {
    errors.push("'before' date must be after 'after' date");
  }

  // Can't use both 'during' and 'before'/'after'
  if (query.during && (query.before || query.after)) {
    errors.push("Cannot use 'during' with 'before' or 'after'");
  }

  // Must have at least text or a filter
  if (
    !query.text &&
    !query.from &&
    !query.mentions &&
    !query.in &&
    !query.has &&
    query.pinned === undefined
  ) {
    errors.push('Query must have at least some search criteria');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get filter suggestions based on partial input
 */
export function getFilterSuggestions(partialInput: string): string[] {
  const filterNames = ['from:', 'mentions:', 'in:', 'before:', 'after:', 'during:', 'has:', 'pinned:'];

  const lastWord = partialInput.split(/\s+/).pop() || '';

  if (!lastWord) return filterNames;

  return filterNames.filter((filter) => filter.startsWith(lastWord.toLowerCase()));
}

/**
 * Get content filter suggestions
 */
export function getContentFilterSuggestions(): ContentFilter[] {
  return ['image', 'video', 'audio', 'file', 'link', 'attachment'];
}

/**
 * Extract all user mentions from query text
 */
export function extractUserIdsFromQuery(queryText: string): string[] {
  const mentions: string[] = [];
  const mentionRegex = /@([a-zA-Z0-9._=-]+:[a-zA-Z0-9.-]+)/g;

  let match;
  while ((match = mentionRegex.exec(queryText)) !== null) {
    mentions.push('@' + match[1]);
  }

  return mentions;
}

/**
 * Extract room IDs/aliases from query
 */
export function extractRoomIdsFromQuery(queryText: string): string[] {
  const rooms: string[] = [];
  const roomRegex = /(#[^\s]+|![^\s:]+:[^\s]+)/g;

  let match;
  while ((match = roomRegex.exec(queryText)) !== null) {
    rooms.push(match[1]);
  }

  return rooms;
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, searchTerms: string[]): string {
  let highlighted = text;

  searchTerms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });

  return highlighted;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split search text into terms
 */
export function splitSearchTerms(text: string): string[] {
  // Split by whitespace, but preserve quoted phrases
  const terms: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    terms.push(match[1] || match[2]);
  }

  return terms;
}
