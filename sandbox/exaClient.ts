/**
 * Exa Client - Search for similar bugs and real-world fixes
 * 
 * This module integrates with Exa (sponsor requirement) to find
 * similar bug patterns and solutions from across the web.
 */

interface ExaSearchResult {
  title: string;
  url: string;
  text: string;
  score?: number;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
}

/**
 * Query Exa for similar bugs and real-world fixes
 * 
 * @param errorText - The bug description or error message
 * @returns Array of pattern descriptions from similar bugs
 */
export async function queryExaForSimilarBugs(errorText: string): Promise<string[]> {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    console.warn('EXA_API_KEY not set, skipping Exa search');
    return getFallbackPatterns();
  }

  try {
    // Construct search query optimized for finding bug fixes
    const searchQuery = constructSearchQuery(errorText);

    console.log(`[Exa] Searching for: "${searchQuery}"`);

    // Call Exa API
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: searchQuery,
        type: 'neural',
        useAutoprompt: true,
        numResults: 5,
        contents: {
          text: true,
        },
        category: 'github',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API error: ${response.status} - ${errorText}`);
    }

    const data: ExaSearchResponse = await response.json();

    console.log(`[Exa] Found ${data.results.length} results`);

    // Extract and format patterns from results
    const patterns = data.results.map((result, index) => {
      const snippet = result.text.substring(0, 300);
      return `Pattern ${index + 1} (from ${result.url}):\n${result.title}\n${snippet}...`;
    });

    return patterns.length > 0 ? patterns : getFallbackPatterns();
  } catch (error) {
    console.error('[Exa] Search failed:', error);
    console.warn('[Exa] Falling back to default patterns');
    return getFallbackPatterns();
  }
}

/**
 * Construct an optimized search query for finding bug fixes
 */
function constructSearchQuery(errorText: string): string {
  // Extract key error information
  const errorType = extractErrorType(errorText);
  const keywords = extractKeywords(errorText);

  // Build query focused on solutions
  let query = 'how to fix ';

  if (errorType) {
    query += `${errorType} `;
  }

  // Add top keywords
  query += keywords.slice(0, 3).join(' ');

  // Add context for better results
  query += ' solution github issue';

  return query;
}

/**
 * Extract error type from error text (e.g., "TypeError", "AttributeError")
 */
function extractErrorType(errorText: string): string | null {
  const errorTypePattern = /(\w+Error|\w+Exception)/;
  const match = errorText.match(errorTypePattern);
  return match ? match[1] : null;
}

/**
 * Extract meaningful keywords from error text
 */
function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'by', 'from', 'error', 'exception',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !commonWords.has(w));

  return [...new Set(words)];
}

/**
 * Fallback patterns when Exa is unavailable
 */
function getFallbackPatterns(): string[] {
  return [
    'Pattern 1: Check for null/undefined values before accessing properties or methods',
    'Pattern 2: Add proper error handling with try-catch blocks around risky operations',
    'Pattern 3: Ensure async operations are properly awaited and promises are handled',
    'Pattern 4: Validate input parameters at function entry points',
    'Pattern 5: Add type checking or type guards before operations on dynamic types',
  ];
}

/**
 * Format patterns for inclusion in LLM prompt
 */
export function formatPatternsForPrompt(patterns: string[]): string {
  if (patterns.length === 0) {
    return 'No similar patterns found.';
  }

  return patterns
    .map((pattern, index) => `${index + 1}. ${pattern}`)
    .join('\n\n');
}
