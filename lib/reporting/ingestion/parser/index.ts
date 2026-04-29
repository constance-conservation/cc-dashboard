/**
 * Parser entry point — routes Safety Culture audit JSON to the appropriate
 * template-specific extractor based on template_id.
 */

import type { ScAudit } from './field_extractors'
import type { ExtractionResult, ParsingWarning } from './types'
import { extractDailyWorkReport } from './daily_work_report'
import { extractChemicalApplicationRecord } from './chemical_application_record'

const DAILY_WORK_REPORT_TEMPLATE = 'template_f0eb0c0c58d24ce6bd21ab671f200a69'
const CHEMICAL_APPLICATION_RECORD_TEMPLATE = 'template_6710ff759a2f4150aba889837ecd9ed2'

export type TemplateType = 'daily_work_report' | 'chemical_application_record' | 'unknown'

export function detectTemplateType(templateId: string): TemplateType {
  switch (templateId) {
    case DAILY_WORK_REPORT_TEMPLATE:
      return 'daily_work_report'
    case CHEMICAL_APPLICATION_RECORD_TEMPLATE:
      return 'chemical_application_record'
    default:
      return 'unknown'
  }
}

/**
 * Parse a raw Safety Culture audit JSON into a structured ExtractionResult.
 * Determines the template type from `template_id` and routes to the
 * appropriate extractor. Never throws — returns warnings for any issues.
 */
export function parseInspection(rawJson: Record<string, unknown>): ExtractionResult {
  const audit = rawJson as unknown as ScAudit

  if (!audit.audit_id || !audit.template_id) {
    return errorResult(
      audit.audit_id ?? 'unknown',
      'Missing required fields: audit_id or template_id'
    )
  }

  const templateType = detectTemplateType(audit.template_id)

  switch (templateType) {
    case 'daily_work_report':
      return safeExtract(() => extractDailyWorkReport(audit), audit)

    case 'chemical_application_record':
      return safeExtract(() => extractChemicalApplicationRecord(audit), audit)

    case 'unknown':
      return errorResult(
        audit.audit_id,
        `Unknown template_id: ${audit.template_id}`,
        rawJson
      )
  }
}

function safeExtract(
  extractor: () => ExtractionResult,
  audit: ScAudit
): ExtractionResult {
  try {
    return extractor()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return errorResult(
      audit.audit_id,
      `Extraction failed with error: ${message}`,
      audit as unknown as Record<string, unknown>
    )
  }
}

function errorResult(
  auditId: string,
  message: string,
  rawJson?: Record<string, unknown>
): ExtractionResult {
  const warning: ParsingWarning = {
    field: '_extraction',
    message,
  }

  return {
    templateType: 'unknown',
    inspection: {
      scAuditId: auditId,
      scTemplateType: 'unknown',
      scModifiedAt: null,
      siteName: null,
      date: null,
      supervisorName: null,
    },
    personnel: [],
    tasks: [],
    weeds: [],
    chemicals: [],
    media: [],
    observations: [],
    metadata: {
      totalWorkedHours: null,
      remainingHours: null,
      weedRemovalPctMin: null,
      weedRemovalPctMax: null,
      erosionWorks: null,
      concernsText: null,
      futureWorksComments: null,
    },
    parsingWarnings: [warning],
    rawJson: rawJson ?? {},
  }
}

export { extractDailyWorkReport } from './daily_work_report'
export { extractChemicalApplicationRecord } from './chemical_application_record'
export type { ExtractionResult } from './types'
export type { ScAudit } from './field_extractors'
