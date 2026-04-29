import { describe, it, expect } from 'vitest'
import {
  handleWebhookPayload,
  type ScWebhookPayload,
} from '../webhook_handler'

const PAYLOAD_COMPLETED: ScWebhookPayload = {
  event: 'inspection.completed',
  audit_id: 'audit_abc123',
  organisation_id: 'role_775367e3fb5f4686b1cd1160ed8d818e',
  triggered_at: '2026-01-15T10:00:00Z',
}

const PAYLOAD_UPDATED: ScWebhookPayload = {
  event: 'inspection.updated',
  audit_id: 'audit_def456',
  organisation_id: 'role_775367e3fb5f4686b1cd1160ed8d818e',
  triggered_at: '2026-01-15T10:05:00Z',
}

const PAYLOAD_STARTED: ScWebhookPayload = {
  event: 'inspection.started',
  audit_id: 'audit_ghi789',
  organisation_id: 'role_775367e3fb5f4686b1cd1160ed8d818e',
}

const PAYLOAD_DELETED: ScWebhookPayload = {
  event: 'inspection.deleted',
  audit_id: 'audit_jkl012',
}

const PAYLOAD_HEADER_FORMAT: ScWebhookPayload = {
  header: { event: 'inspection.completed' },
  inspection_id: 'audit_mno345',
}

const PAYLOAD_UNDERSCORE_EVENT: ScWebhookPayload = {
  event: 'inspection_completed',
  audit_id: 'audit_pqr678',
}

const PAYLOAD_NO_EVENT: ScWebhookPayload = {
  audit_id: 'audit_stu901',
}

const PAYLOAD_NO_AUDIT_ID: ScWebhookPayload = {
  event: 'inspection.completed',
}

describe('handleWebhookPayload', () => {
  it('returns processing action for inspection.completed', () => {
    const result = handleWebhookPayload(PAYLOAD_COMPLETED)
    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual({
      ok: true,
      action: 'processing',
      auditId: 'audit_abc123',
    })
  })

  it('returns processing action for inspection.updated', () => {
    const result = handleWebhookPayload(PAYLOAD_UPDATED)
    expect(result.statusCode).toBe(200)
    expect(result.body).toMatchObject({ action: 'processing', auditId: 'audit_def456' })
  })

  it('ignores inspection.started', () => {
    const result = handleWebhookPayload(PAYLOAD_STARTED)
    expect(result.statusCode).toBe(200)
    expect(result.body).toMatchObject({
      action: 'ignored',
      reason: 'event_type_not_handled',
      event: 'inspection.started',
    })
  })

  it('ignores inspection.deleted', () => {
    const result = handleWebhookPayload(PAYLOAD_DELETED)
    expect(result.statusCode).toBe(200)
    expect(result.body).toMatchObject({
      action: 'ignored',
      reason: 'event_type_not_handled',
    })
  })

  it('handles SC header-format event payloads', () => {
    const result = handleWebhookPayload(PAYLOAD_HEADER_FORMAT)
    expect(result.statusCode).toBe(200)
    expect(result.body).toMatchObject({
      action: 'processing',
      auditId: 'audit_mno345',
    })
  })

  it('handles underscore-delimited event names (inspection_completed)', () => {
    const result = handleWebhookPayload(PAYLOAD_UNDERSCORE_EVENT)
    expect(result.statusCode).toBe(200)
    expect(result.body).toMatchObject({
      action: 'processing',
      auditId: 'audit_pqr678',
    })
  })

  it('ignores payloads with missing event type', () => {
    const result = handleWebhookPayload(PAYLOAD_NO_EVENT)
    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual({
      ok: true,
      action: 'ignored',
      reason: 'missing_event_type',
    })
  })

  it('ignores processable event with missing audit_id', () => {
    const result = handleWebhookPayload(PAYLOAD_NO_AUDIT_ID)
    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual({
      ok: true,
      action: 'ignored',
      reason: 'missing_audit_id',
    })
  })

  it('is pure — calling multiple times returns the same shape', () => {
    const a = handleWebhookPayload(PAYLOAD_COMPLETED)
    const b = handleWebhookPayload(PAYLOAD_COMPLETED)
    const c = handleWebhookPayload(PAYLOAD_COMPLETED)
    expect(b).toEqual(a)
    expect(c).toEqual(a)
  })
})
