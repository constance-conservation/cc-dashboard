/**
 * Database Writer — Supabase upsert layer.
 *
 * Takes a structured ExtractionResult from the parser and writes it to Supabase.
 * Idempotent via UPSERT on sc_audit_id. Child records are delete-and-reinserted
 * on reprocess.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ExtractionResult,
  ChemicalApplicationFields,
  ParsingWarning,
} from './parser/types'
import {
  resolveSite,
  resolveStaff,
  resolveStaffBatch,
  resolveSpeciesBatch,
  resolveChemicalBatch,
  type ResolvedSpecies,
  type ResolvedChemical,
} from './lookups'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ─────────────────────────────────────────────────────────────

export interface WriteResult {
  inspectionId: string
  scAuditId: string
  status: 'completed' | 'needs_review' | 'failed'
  warnings: ParsingWarning[]
  /** IDs of auto-created lookup records (sites, staff) for manual review */
  autoCreated: { type: string; name: string; id: string }[]
  error?: string
}

// ── Main entry point ──────────────────────────────────────────────────

/**
 * Upsert an extracted inspection into Supabase.
 * Idempotent via sc_audit_id conflict key.
 *
 * @param extraction - Structured extraction from the parser
 * @param organizationId - Organization UUID for multi-tenant writes
 * @param client - Optional Supabase client override (for testing). Falls back to createAdminClient().
 */
export async function writeInspection(
  extraction: ExtractionResult,
  organizationId: string,
  client?: SupabaseClient
): Promise<WriteResult> {
  const db = client ?? createAdminClient()
  const autoCreated: WriteResult['autoCreated'] = []
  const { inspection, parsingWarnings } = extraction
  const scAuditId = inspection.scAuditId

  try {
    // ── 1. Resolve lookups ──────────────────────────────────────────

    let siteId: string | null = null
    if (inspection.siteName) {
      const site = await resolveSite(db, organizationId, inspection.siteName)
      siteId = site.siteId
      if (site.created) {
        autoCreated.push({ type: 'site', name: inspection.siteName, id: site.siteId })
      }
    }

    let supervisorId: string | null = null
    if (inspection.supervisorName) {
      const supervisor = await resolveStaff(db, organizationId, inspection.supervisorName)
      supervisorId = supervisor.staffId
      if (supervisor.created) {
        autoCreated.push({ type: 'staff', name: inspection.supervisorName, id: supervisor.staffId })
      }
    }

    const personnelNames = extraction.personnel.map(p => p.staffName)
    const staffMap = await resolveStaffBatch(db, organizationId, personnelNames)

    const speciesNames = extraction.weeds.map(w => w.speciesNameRaw)
    const speciesMap = await resolveSpeciesBatch(db, speciesNames)

    const chemicalNames = extraction.chemicals.map(c => c.chemicalNameRaw)
    if (extraction.chemicalApplicationRecord) {
      for (const item of extraction.chemicalApplicationRecord.items) {
        chemicalNames.push(item.chemicalNameRaw)
      }
    }
    const chemicalMap = await resolveChemicalBatch(db, chemicalNames)

    if (extraction.chemicalApplicationRecord) {
      const operatorNames = extraction.chemicalApplicationRecord.operatorNames
      const operatorMap = await resolveStaffBatch(db, organizationId, operatorNames)
      for (const [key, value] of operatorMap) {
        staffMap.set(key, value)
      }
    }

    // ── 2. Upsert inspection record ──────────────────────────────────

    const inspectionRow = {
      organization_id: organizationId,
      sc_audit_id: scAuditId,
      sc_template_type: inspection.scTemplateType,
      site_id: siteId,
      date: inspection.date,
      supervisor_id: supervisorId,
      sc_modified_at: inspection.scModifiedAt,
      sc_raw_json: extraction.rawJson,
      processing_status: 'processing' as const,
    }

    const { data: upserted, error: upsertError } = await db
      .from('inspections')
      .upsert(inspectionRow, { onConflict: 'sc_audit_id' })
      .select('id')
      .single()

    if (upsertError || !upserted) {
      throw new Error(
        `Failed to upsert inspection ${scAuditId}: ${upsertError?.message ?? 'no data returned'}`
      )
    }

    const inspectionId = upserted.id as string

    console.log(`[writer] upserted inspection ${scAuditId} (id=${inspectionId})`)

    // ── 3. Delete existing child records ─────────────────────────────

    await deleteChildRecords(db, inspectionId)

    // ── 4. Insert child records ──────────────────────────────────────

    await insertPersonnel(db, inspectionId, extraction, staffMap)
    await insertTasks(db, inspectionId, extraction)
    await insertWeeds(db, inspectionId, extraction, speciesMap)
    await insertChemicals(db, inspectionId, extraction, chemicalMap)
    await insertMedia(db, inspectionId, extraction)
    await insertObservations(db, inspectionId, extraction)
    await insertMetadata(db, inspectionId, extraction)

    // ── 5. Chemical Application Record (separate tables) ─────────────

    if (extraction.chemicalApplicationRecord) {
      await writeChemicalApplicationRecord(
        db,
        inspectionId,
        siteId,
        extraction.chemicalApplicationRecord,
        staffMap,
        chemicalMap
      )
    }

    // ── 6. Set final processing status ───────────────────────────────

    const status: WriteResult['status'] =
      parsingWarnings.length > 0 ? 'needs_review' : 'completed'

    await db
      .from('inspections')
      .update({ processing_status: status })
      .eq('id', inspectionId)

    console.log(
      `[writer] complete: scAuditId=${scAuditId} inspectionId=${inspectionId} status=${status} autoCreated=${autoCreated.length}`
    )

    return {
      inspectionId,
      scAuditId,
      status,
      warnings: parsingWarnings,
      autoCreated,
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    await db
      .from('inspections')
      .update({ processing_status: 'failed' })
      .eq('sc_audit_id', scAuditId)

    console.error(`[writer] failed: scAuditId=${scAuditId} error=${message}`)

    return {
      inspectionId: '',
      scAuditId,
      status: 'failed',
      warnings: [
        ...parsingWarnings,
        { field: '_writer', message: `DB write failed: ${message}` },
      ],
      autoCreated,
      error: message,
    }
  }
}

// ── Child record helpers ──────────────────────────────────────────────

const CHILD_TABLES = [
  'inspection_personnel',
  'inspection_tasks',
  'inspection_weeds',
  'inspection_chemicals',
  'inspection_media',
  'inspection_observations',
  'inspection_metadata',
] as const

async function deleteChildRecords(
  db: SupabaseClient,
  inspectionId: string
): Promise<void> {
  for (const table of CHILD_TABLES) {
    const { error } = await db
      .from(table)
      .delete()
      .eq('inspection_id', inspectionId)

    if (error) {
      throw new Error(`Failed to delete from ${table}: ${error.message}`)
    }
  }
}

async function insertPersonnel(
  db: SupabaseClient,
  inspectionId: string,
  extraction: ExtractionResult,
  staffMap: Map<string, string>
): Promise<void> {
  if (extraction.personnel.length === 0) return

  const rows = extraction.personnel.map(p => ({
    inspection_id: inspectionId,
    staff_id: staffMap.get(p.staffName.trim().toLowerCase()) ?? null,
    hours_worked: p.hoursWorked,
    raw_hours_text: p.rawHoursText,
  }))

  const { error } = await db
    .from('inspection_personnel')
    .insert(rows)

  if (error) {
    throw new Error(`Failed to insert inspection_personnel: ${error.message}`)
  }
}

async function insertTasks(
  db: SupabaseClient,
  inspectionId: string,
  extraction: ExtractionResult
): Promise<void> {
  if (extraction.tasks.length === 0) return

  const rows = extraction.tasks.map(t => ({
    inspection_id: inspectionId,
    task_type: t.taskType,
    details_text: t.detailsText,
  }))

  const { error } = await db
    .from('inspection_tasks')
    .insert(rows)

  if (error) {
    throw new Error(`Failed to insert inspection_tasks: ${error.message}`)
  }
}

async function insertWeeds(
  db: SupabaseClient,
  inspectionId: string,
  extraction: ExtractionResult,
  speciesMap: Map<string, ResolvedSpecies>
): Promise<void> {
  if (extraction.weeds.length === 0) return

  const rows = extraction.weeds.map(w => {
    const resolved = speciesMap.get(w.speciesNameRaw.trim().toLowerCase())
    return {
      inspection_id: inspectionId,
      species_name_raw: w.speciesNameRaw,
      species_name_canonical: resolved?.canonicalName ?? null,
      scientific_name: resolved?.scientificName ?? null,
      species_type: resolved?.speciesType ?? null,
      source: w.source,
    }
  })

  const { error } = await db
    .from('inspection_weeds')
    .insert(rows)

  if (error) {
    throw new Error(`Failed to insert inspection_weeds: ${error.message}`)
  }
}

async function insertChemicals(
  db: SupabaseClient,
  inspectionId: string,
  extraction: ExtractionResult,
  chemicalMap: Map<string, ResolvedChemical>
): Promise<void> {
  if (extraction.chemicals.length === 0) return

  const rows = extraction.chemicals.map(c => {
    const resolved = chemicalMap.get(c.chemicalNameRaw.trim().toLowerCase())
    return {
      inspection_id: inspectionId,
      chemical_name_raw: c.chemicalNameRaw,
      chemical_name_canonical: resolved?.canonicalName ?? null,
      rate_raw: c.rateRaw,
      rate_value: c.rateValue,
      rate_unit: c.rateUnit,
      source_template: c.sourceTemplate,
    }
  })

  const { error } = await db
    .from('inspection_chemicals')
    .insert(rows)

  if (error) {
    throw new Error(`Failed to insert inspection_chemicals: ${error.message}`)
  }
}

async function insertMedia(
  db: SupabaseClient,
  inspectionId: string,
  extraction: ExtractionResult
): Promise<void> {
  if (extraction.media.length === 0) return

  const rows = extraction.media.map(m => ({
    inspection_id: inspectionId,
    media_type: m.mediaType,
    sc_media_href: m.scMediaHref,
    gps_lat: m.gpsLat,
    gps_lon: m.gpsLon,
    before_after: m.beforeAfter,
  }))

  const { error } = await db
    .from('inspection_media')
    .insert(rows)

  if (error) {
    throw new Error(`Failed to insert inspection_media: ${error.message}`)
  }
}

async function insertObservations(
  db: SupabaseClient,
  inspectionId: string,
  extraction: ExtractionResult
): Promise<void> {
  if (extraction.observations.length === 0) return

  const rows = extraction.observations.map(o => ({
    inspection_id: inspectionId,
    observation_type: o.observationType,
    species_name: o.speciesName,
    notes: o.notes,
  }))

  const { error } = await db
    .from('inspection_observations')
    .insert(rows)

  if (error) {
    throw new Error(`Failed to insert inspection_observations: ${error.message}`)
  }
}

async function insertMetadata(
  db: SupabaseClient,
  inspectionId: string,
  extraction: ExtractionResult
): Promise<void> {
  const m = extraction.metadata

  const hasData = m.totalWorkedHours != null
    || m.remainingHours != null
    || m.weedRemovalPctMin != null
    || m.weedRemovalPctMax != null
    || m.erosionWorks != null
    || m.concernsText != null
    || m.futureWorksComments != null

  if (!hasData) return

  const { error } = await db
    .from('inspection_metadata')
    .insert({
      inspection_id: inspectionId,
      total_worked_hours: m.totalWorkedHours,
      remaining_hours: m.remainingHours,
      weed_removal_pct_min: m.weedRemovalPctMin,
      weed_removal_pct_max: m.weedRemovalPctMax,
      erosion_works: m.erosionWorks,
      concerns_text: m.concernsText,
      future_works_comments: m.futureWorksComments,
    })

  if (error) {
    throw new Error(`Failed to insert inspection_metadata: ${error.message}`)
  }
}

// ── Chemical Application Record ───────────────────────────────────────

async function writeChemicalApplicationRecord(
  db: SupabaseClient,
  inspectionId: string,
  siteId: string | null,
  car: ChemicalApplicationFields,
  staffMap: Map<string, string>,
  chemicalMap: Map<string, ResolvedChemical>
): Promise<void> {
  const { data: existingCar } = await db
    .from('chemical_application_records')
    .select('id')
    .eq('sc_audit_id', car.scAuditId)
    .single()

  if (existingCar?.id) {
    await db
      .from('chemical_application_records')
      .delete()
      .eq('id', existingCar.id)
  }

  const { data: newCar, error: carError } = await db
    .from('chemical_application_records')
    .insert({
      inspection_id: inspectionId,
      sc_audit_id: car.scAuditId,
      site_id: siteId,
      date: car.date,
      application_method: car.applicationMethod,
      time_start: car.timeStart,
      time_finish: car.timeFinish,
      total_amount_sprayed_litres: car.totalAmountSprayedLitres,
      weather_general: car.weatherGeneral,
      wind_direction: car.windDirection,
      wind_speed: car.windSpeed,
      wind_variability: car.windVariability,
      rainfall: car.rainfall,
      temperature: car.temperature,
      humidity: car.humidity,
      public_notification: car.publicNotification,
    })
    .select('id')
    .single()

  if (carError || !newCar) {
    throw new Error(
      `Failed to insert chemical_application_records: ${carError?.message ?? 'no data returned'}`
    )
  }

  const carId = newCar.id as string

  if (car.items.length > 0) {
    const itemRows = car.items.map(item => {
      const resolved = chemicalMap.get(item.chemicalNameRaw.trim().toLowerCase())
      return {
        application_record_id: carId,
        chemical_name_raw: item.chemicalNameRaw,
        chemical_name_canonical: resolved?.canonicalName ?? null,
        rate_raw: item.rateRaw,
        rate_value: item.rateValue,
        rate_unit: item.rateUnit,
        concentrate_raw: item.concentrateRaw,
      }
    })

    const { error } = await db
      .from('chemical_application_items')
      .insert(itemRows)

    if (error) {
      throw new Error(`Failed to insert chemical_application_items: ${error.message}`)
    }
  }

  if (car.operatorNames.length > 0) {
    const operatorRows = car.operatorNames.map(name => ({
      application_record_id: carId,
      staff_id: staffMap.get(name.trim().toLowerCase()) ?? null,
    }))

    const { error } = await db
      .from('chemical_application_operators')
      .insert(operatorRows)

    if (error) {
      throw new Error(`Failed to insert chemical_application_operators: ${error.message}`)
    }
  }

  if (car.additives.length > 0) {
    const additiveRows = car.additives.map(a => ({
      application_record_id: carId,
      additive_name: a.additiveName,
      rate_raw: a.rateRaw,
    }))

    const { error } = await db
      .from('chemical_application_additives')
      .insert(additiveRows)

    if (error) {
      throw new Error(`Failed to insert chemical_application_additives: ${error.message}`)
    }
  }

  console.log(`[writer] wrote CAR: id=${carId} scAuditId=${car.scAuditId}`)
}
