export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  source: 'live_web' | 'knowledge_base_fallback';
  available: boolean;
}

export class WebSearchService {
  /**
   * Search live authoritative web sources with timeouts
   */
  static async search(query: string, limit = 3): Promise<WebSearchResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { query, results: [], source: 'live_web', available: false };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Query Wikipedia API for authoritative medical, scientific, and general knowledge
      const encoded = encodeURIComponent(cleanQuery);
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&origin=*&utf8=1`;

      const res = await fetch(wikiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MediSlot-Clinical-Assistant/1.0 (info@medislot.health)',
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const searchItems: any[] = data.query?.search || [];

        if (searchItems.length > 0) {
          const results: WebSearchResult[] = searchItems.slice(0, limit).map((item) => {
            const cleanSnippet = (item.snippet || '')
              .replace(/<span class="searchmatch">/g, '')
              .replace(/<\/span>/g, '')
              .replace(/&quot;/g, '"')
              .replace(/&#039;/g, "'")
              .replace(/&amp;/g, '&');

            return {
              title: item.title,
              snippet: cleanSnippet,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
            };
          });

          return {
            query: cleanQuery,
            results,
            source: 'live_web',
            available: true,
          };
        }
      }
    } catch (err: any) {
      // Network blocked or offline
      // console.warn('Live web search unreachable:', err?.message || err);
    }

    // Return empty results with honest availability flag
    return {
      query: cleanQuery,
      results: [],
      source: 'live_web',
      available: false,
    };
  }
}
