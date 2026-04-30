import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  mockFrom,
  mockParseInspection,
  mockWriteInspection,
  mockFetchAllFeedPages,
  mockFetchAudit,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockParseInspection: vi.fn(),
  mockWriteInspection: vi.fn(),
  mockFetchAllFeedPages: vi.fn(),
  mockFetchAudit: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

vi.mock('../parser', () => ({
  parseInspection: mockParseInspection,
}))

vi.mock('../writer', () => ({
  writeInspection: mockWriteInspection,
}))

vi.mock('../sc_api_client', () => {
  function MockScApiClient() {
    return {
      fetchAllFeedPages: mockFetchAllFeedPages,
      fetchAudit: mockFetchAudit,
    }
  }
  return {
    ScApiClient: MockScApiClient,
    ScApiError: class ScApiError extends Error {
      statusCode: number
      responseBody: string
      constructor(msg: string, status: number, body: string) {
        super(msg)
        this.statusCode = status
        this.responseBody = body
      }
    },
  }
})

import { runSync } from '../scheduled_sync'

function setupSupabaseMocks(overrides: {
  syncState?: Partial<{
    id: string
    high_water_mark: string | null
    total_synced: number
    last_error: string | null
  }>
  existingAudits?: Map<string, string>
  orgId?: string
} = {}) {
  const syncState = {
    id: 'sync-state-uuid',
    last_sync_at: null,
    high_water_mark: null,
    last_cursor: null,
    total_synced: 0,
    last_error: null,
    ...overrides.syncState,
  }

  const orgId = overrides.orgId ?? 'org-uuid-1'
  const existingAudits = overrides.existingAudits ?? new Map()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'sync_state') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: syncState, error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }
    }
    if (table === 'organizations') {
      return {
        select: () => ({
          limit: () => ({
            single: () => Promise.resolve({ data: { id: orgId }, error: null }),
          }),
        }),
      }
    }
    if (table === 'inspections') {
      return {
        select: () => ({
          eq: (_col: string, val: string) => ({
            maybeSingle: () => {
              const modifiedAt = existingAudits.get(val)
              return Promise.resolve({
                data: modifiedAt ? { sc_modified_at: modifiedAt } : null,
                error: null,
              })
            },
          }),
        }),
        upsert: () => ({}),
      }
    }
    return {}
  })
}

async function* yieldEntries(...pages: Array<Array<{
  id: string
  modified_at: string
  template_id?: string
  archived?: boolean
  created_at?: string
}>>) {
  for (const page of pages) {
    yield page.map(e => ({
      id: e.id,
      modified_at: e.modified_at,
      template_id: e.template_id ?? 'template_test',
      archived: e.archived ?? false,
      created_at: e.created_at ?? e.modified_at,
    }))
  }
}

describe('scheduled_sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SAFETY_CULTURE_API_TOKEN = 'test-token'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('processes new inspections end-to-end', async () => {
    setupSupabaseMocks()

    mockFetchAllFeedPages.mockReturnValue(
      yieldEntries([
        { id: 'audit_1', modified_at: '2025-01-01T00:00:00Z' },
        { id: 'audit_2', modified_at: '2025-01-02T00:00:00Z' },
      ])
    )

    mockFetchAudit.mockResolvedValue({ id: 'test', template_id: 'template_test' })
    mockParseInspection.mockReturnValue({ inspection: { scAuditId: 'test' } })
    mockWriteInspection.mockResolvedValue({
      inspectionId: 'uuid-1',
      scAuditId: 'test',
      status: 'completed',
    })

    const result = await runSync()

    expect(result.processed).toBe(2)
    expect(result.skipped).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockFetchAudit).toHaveBeenCalledTimes(2)
    expect(mockParseInspection).toHaveBeenCalledTimes(2)
    expect(mockWriteInspection).toHaveBeenCalledTimes(2)
  })

  it('skips unchanged inspections (dedup)', async () => {
    setupSupabaseMocks({
      existingAudits: new Map([
        ['audit_1', '2025-01-01T00:00:00Z'],
      ]),
    })

    mockFetchAllFeedPages.mockReturnValue(
      yieldEntries([
        { id: 'audit_1', modified_at: '2025-01-01T00:00:00Z' },
        { id: 'audit_2', modified_at: '2025-01-02T00:00:00Z' },
      ])
    )

    mockFetchAudit.mockResolvedValue({ id: 'test' })
    mockParseInspection.mockReturnValue({ inspection: { scAuditId: 'test' } })
    mockWriteInspection.mockResolvedValue({
      inspectionId: 'uuid-1',
      scAuditId: 'test',
      status: 'completed',
    })

    const result = await runSync()

    expect(result.skipped).toBe(1)
    expect(result.processed).toBe(1)
    expect(mockFetchAudit).toHaveBeenCalledTimes(1)
  })

  it('reprocesses inspections with changed sc_modified_at', async () => {
    setupSupabaseMocks({
      existingAudits: new Map([
        ['audit_1', '2025-01-01T00:00:00Z'],
      ]),
    })

    mockFetchAllFeedPages.mockReturnValue(
      yieldEntries([
        { id: 'audit_1', modified_at: '2025-01-05T00:00:00Z' },
      ])
    )

    mockFetchAudit.mockResolvedValue({ id: 'audit_1' })
    mockParseInspection.mockReturnValue({ inspection: { scAuditId: 'audit_1' } })
    mockWriteInspection.mockResolvedValue({
      inspectionId: 'uuid-1',
      scAuditId: 'audit_1',
      status: 'completed',
    })

    const result = await runSync()

    expect(result.processed).toBe(1)
    expect(result.skipped).toBe(0)
    expect(mockFetchAudit).toHaveBeenCalledWith('audit_1')
  })

  it('skips archived inspections', async () => {
    setupSupabaseMocks()

    mockFetchAllFeedPages.mockReturnValue(
      yieldEntries([
        { id: 'audit_archived', modified_at: '2025-01-01T00:00:00Z', archived: true },
        { id: 'audit_active', modified_at: '2025-01-02T00:00:00Z', archived: false },
      ])
    )

    mockFetchAudit.mockResolvedValue({ id: 'test' })
    mockParseInspection.mockReturnValue({ inspection: { scAuditId: 'test' } })
    mockWriteInspection.mockResolvedValue({
      inspectionId: 'uuid-1',
      scAuditId: 'test',
      status: 'completed',
    })

    const result = await runSync()

    expect(result.processed).toBe(1)
    expect(mockFetchAudit).toHaveBeenCalledTimes(1)
  })

  it('continues batch on per-inspection failure', async () => {
    setupSupabaseMocks()

    mockFetchAllFeedPages.mockReturnValue(
      yieldEntries([
        { id: 'audit_fail', modified_at: '2025-01-01T00:00:00Z' },
        { id: 'audit_ok', modified_at: '2025-01-02T00:00:00Z' },
      ])
    )

    mockFetchAudit
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce({ id: 'audit_ok' })

    mockParseInspection.mockReturnValue({ inspection: { scAuditId: 'test' } })
    mockWriteInspection.mockResolvedValue({
      inspectionId: 'uuid-1',
      scAuditId: 'audit_ok',
      status: 'completed',
    })

    const result = await runSync()

    expect(result.failed).toBe(1)
    expect(result.processed).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].auditId).toBe('audit_fail')
    expect(result.errors[0].error).toContain('API timeout')
  })

  it('records failed status from writer', async () => {
    setupSupabaseMocks()

    mockFetchAllFeedPages.mockReturnValue(
      yieldEntries([
        { id: 'audit_1', modified_at: '2025-01-01T00:00:00Z' },
      ])
    )

    mockFetchAudit.mockResolvedValue({ id: 'audit_1' })
    mockParseInspection.mockReturnValue({ inspection: { scAuditId: 'audit_1' } })
    mockWriteInspection.mockResolvedValue({
      inspectionId: 'uuid-1',
      scAuditId: 'audit_1',
      status: 'failed',
      error: 'DB constraint violation',
    })

    const result = await runSync()

    expect(result.failed).toBe(1)
    expect(result.errors[0].error).toBe('DB constraint violation')
  })

  it('uses high-water mark from sync_state for incremental sync', async () => {
    setupSupabaseMocks({
      syncState: {
        high_water_mark: '2025-06-01T00:00:00Z',
        total_synced: 50,
      },
    })

    mockFetchAllFeedPages.mockReturnValue(yieldEntries([]))

    await runSync()

    expect(mockFetchAllFeedPages).toHaveBeenCalledWith('2025-06-01T00:00:00Z')
  })

  it('passes undefined to fetchAllFeedPages when high_water_mark is null', async () => {
    setupSupabaseMocks({
      syncState: { high_water_mark: null },
    })

    mockFetchAllFeedPages.mockReturnValue(yieldEntries([]))

    await runSync()

    expect(mockFetchAllFeedPages).toHaveBeenCalledWith(undefined)
  })

  it('handles empty feed (no inspections to sync)', async () => {
    setupSupabaseMocks()

    mockFetchAllFeedPages.mockReturnValue(yieldEntries([]))

    const result = await runSync()

    expect(result.processed).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.failed).toBe(0)
  })

  it('processes multiple pages', async () => {
    setupSupabaseMocks()

    mockFetchAllFeedPages.mockReturnValue(
      yieldEntries(
        [
          { id: 'audit_1', modified_at: '2025-01-01T00:00:00Z' },
          { id: 'audit_2', modified_at: '2025-01-02T00:00:00Z' },
        ],
        [
          { id: 'audit_3', modified_at: '2025-01-03T00:00:00Z' },
        ]
      )
    )

    mockFetchAudit.mockResolvedValue({ id: 'test' })
    mockParseInspection.mockReturnValue({ inspection: { scAuditId: 'test' } })
    mockWriteInspection.mockResolvedValue({
      inspectionId: 'uuid-1',
      scAuditId: 'test',
      status: 'completed',
    })

    const result = await runSync()

    expect(result.processed).toBe(3)
  })
})
