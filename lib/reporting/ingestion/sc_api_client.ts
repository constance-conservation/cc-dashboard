/**
 * Safety Culture API client — feed + audit endpoints.
 *
 * Handles pagination, rate limiting, and authentication.
 */

// ── Defaults inlined from the standalone's shared/config.ts ──────────

const DEFAULT_RATE_LIMIT_MS = 200
const DEFAULT_FEED_PAGE_SIZE = 100
const DEFAULT_BASE_URL = 'https://api.safetyculture.io'

// ── Response types from SC API ───────────────────────────────────────

export interface FeedInspectionEntry {
  id: string
  modified_at: string
  template_id: string
  archived: boolean
  created_at: string
  /** Some feed responses include the audit name */
  name?: string
}

export interface FeedResponse {
  count: number
  total: number
  data: FeedInspectionEntry[]
  metadata: {
    next_page: string | null
    remaining_records: number
  }
}

export interface ScApiClientOptions {
  apiToken: string
  baseUrl?: string
  rateLimitMs?: number
  feedPageSize?: number
}

export class ScApiClient {
  private readonly apiToken: string
  private readonly baseUrl: string
  private readonly rateLimitMs: number
  private readonly feedPageSize: number
  private lastRequestTime: number = 0

  constructor(options: ScApiClientOptions) {
    this.apiToken = options.apiToken
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.rateLimitMs = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS
    this.feedPageSize = options.feedPageSize ?? DEFAULT_FEED_PAGE_SIZE
  }

  private async throttle(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < this.rateLimitMs) {
      const delay = this.rateLimitMs - elapsed
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    this.lastRequestTime = Date.now()
  }

  private async request<T>(path: string): Promise<T> {
    await this.throttle()

    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '<unreadable>')
      throw new ScApiError(
        `SC API ${response.status}: ${response.statusText}`,
        response.status,
        body
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Fetch a single page of the inspections feed.
   *
   * @param modifiedAfter - ISO timestamp to filter by modified_at > this value
   * @param cursor - Pagination cursor (from metadata.next_page of previous response)
   */
  async fetchFeedPage(
    modifiedAfter?: string,
    cursor?: string
  ): Promise<FeedResponse> {
    if (cursor) {
      return this.request<FeedResponse>(cursor)
    }

    const params = new URLSearchParams()
    params.set('limit', String(this.feedPageSize))
    if (modifiedAfter) {
      params.set('modified_after', modifiedAfter)
    }

    return this.request<FeedResponse>(`/feed/inspections?${params.toString()}`)
  }

  /**
   * Iterate through all pages of the inspections feed.
   * Yields each page's entries. Follows metadata.next_page until remaining_records is 0.
   */
  async *fetchAllFeedPages(
    modifiedAfter?: string
  ): AsyncGenerator<FeedInspectionEntry[], void, unknown> {
    let cursor: string | undefined
    let pageNumber = 0

    while (true) {
      pageNumber++
      const response = await this.fetchFeedPage(modifiedAfter, cursor)

      console.log(
        `[sc-api] feed page ${pageNumber}: count=${response.count} total=${response.total} remaining=${response.metadata.remaining_records}`
      )

      if (response.data.length > 0) {
        yield response.data
      }

      if (
        response.metadata.remaining_records === 0 ||
        !response.metadata.next_page
      ) {
        break
      }

      cursor = response.metadata.next_page
    }
  }

  /**
   * Fetch the full audit JSON for a single inspection.
   */
  async fetchAudit(auditId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/audits/${auditId}`)
  }
}

export class ScApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string
  ) {
    super(message)
    this.name = 'ScApiError'
  }
}
