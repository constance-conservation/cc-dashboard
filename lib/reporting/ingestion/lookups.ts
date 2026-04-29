import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────

export interface ResolvedSite {
  siteId: string
  created: boolean
}

export interface ResolvedStaff {
  staffId: string
  created: boolean
}

export interface ResolvedSpecies {
  canonicalName: string | null
  scientificName: string | null
  speciesType: string | null
}

export interface ResolvedChemical {
  canonicalName: string | null
}

// ── Site resolution ───────────────────────────────────────────────────

/**
 * Resolve a Safety Culture site label/text to a site_id.
 *
 * Strategy:
 *   1. Query site_name_lookup by sc_label (case-insensitive)
 *   2. If no match, query sites by canonical_name or name (case-insensitive)
 *   3. If still no match, create a new sites row and log for manual review
 */
export async function resolveSite(
  supabase: SupabaseClient,
  organizationId: string,
  scSiteName: string
): Promise<ResolvedSite> {
  const normalized = scSiteName.trim().toLowerCase()

  const { data: lookupHit } = await supabase
    .from('site_name_lookup')
    .select('site_id')
    .ilike('sc_label', normalized)
    .limit(1)
    .single()

  if (lookupHit?.site_id) {
    return { siteId: lookupHit.site_id, created: false }
  }

  const { data: siteHit } = await supabase
    .from('sites')
    .select('id')
    .or(`canonical_name.ilike.${normalized},name.ilike.${normalized}`)
    .eq('organization_id', organizationId)
    .limit(1)
    .single()

  if (siteHit?.id) {
    return { siteId: siteHit.id, created: false }
  }

  const { data: newSite, error } = await supabase
    .from('sites')
    .insert({
      organization_id: organizationId,
      name: scSiteName.trim(),
      canonical_name: normalized,
      sc_label: scSiteName.trim(),
    })
    .select('id')
    .single()

  if (error || !newSite) {
    throw new Error(
      `Failed to create site for "${scSiteName}": ${error?.message ?? 'no data returned'}`
    )
  }

  console.warn(
    `[lookups] Auto-created site "${scSiteName}" (id=${newSite.id}). Needs manual review.`
  )

  return { siteId: newSite.id, created: true }
}

// ── Staff resolution ──────────────────────────────────────────────────

export async function resolveStaff(
  supabase: SupabaseClient,
  organizationId: string,
  staffName: string
): Promise<ResolvedStaff> {
  const trimmed = staffName.trim()

  const { data: staffHit } = await supabase
    .from('staff')
    .select('id')
    .ilike('name', trimmed)
    .eq('organization_id', organizationId)
    .limit(1)
    .single()

  if (staffHit?.id) {
    return { staffId: staffHit.id, created: false }
  }

  const { data: newStaff, error } = await supabase
    .from('staff')
    .insert({
      organization_id: organizationId,
      name: trimmed,
    })
    .select('id')
    .single()

  if (error || !newStaff) {
    throw new Error(
      `Failed to create staff for "${trimmed}": ${error?.message ?? 'no data returned'}`
    )
  }

  console.warn(
    `[lookups] Auto-created staff "${trimmed}" (id=${newStaff.id}). Needs manual review.`
  )

  return { staffId: newStaff.id, created: true }
}

// ── Species resolution ────────────────────────────────────────────────

export async function resolveSpecies(
  supabase: SupabaseClient,
  speciesNameRaw: string
): Promise<ResolvedSpecies> {
  const normalized = speciesNameRaw.trim().toLowerCase()

  const { data: hit } = await supabase
    .from('species_lookup')
    .select('canonical_name, scientific_name, species_type')
    .ilike('canonical_name', normalized)
    .limit(1)
    .single()

  if (hit) {
    return {
      canonicalName: hit.canonical_name,
      scientificName: hit.scientific_name,
      speciesType: hit.species_type,
    }
  }

  // common_aliases is JSONB array; fetch and filter client-side for case-insensitive match
  const { data: aliasRows } = await supabase
    .from('species_lookup')
    .select('canonical_name, scientific_name, species_type, common_aliases')
    .not('common_aliases', 'is', null)

  if (aliasRows) {
    for (const row of aliasRows) {
      const aliases = row.common_aliases as string[] | null
      if (aliases?.some((a: string) => a.toLowerCase() === normalized)) {
        return {
          canonicalName: row.canonical_name,
          scientificName: row.scientific_name,
          speciesType: row.species_type,
        }
      }
    }
  }

  return { canonicalName: null, scientificName: null, speciesType: null }
}

// ── Chemical resolution ───────────────────────────────────────────────

export async function resolveChemical(
  supabase: SupabaseClient,
  chemicalNameRaw: string
): Promise<ResolvedChemical> {
  const normalized = chemicalNameRaw.trim().toLowerCase()

  const { data: hit } = await supabase
    .from('chemical_lookup')
    .select('canonical_name')
    .ilike('canonical_name', normalized)
    .limit(1)
    .single()

  if (hit) {
    return { canonicalName: hit.canonical_name }
  }

  const { data: aliasRows } = await supabase
    .from('chemical_lookup')
    .select('canonical_name, common_aliases')
    .not('common_aliases', 'is', null)

  if (aliasRows) {
    for (const row of aliasRows) {
      const aliases = row.common_aliases as string[] | null
      if (aliases?.some((a: string) => a.toLowerCase() === normalized)) {
        return { canonicalName: row.canonical_name }
      }
    }
  }

  return { canonicalName: null }
}

// ── Batch helpers ─────────────────────────────────────────────────────

export async function resolveStaffBatch(
  supabase: SupabaseClient,
  organizationId: string,
  names: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  const unique = [...new Set(names.map(n => n.trim()))]

  for (const name of unique) {
    const resolved = await resolveStaff(supabase, organizationId, name)
    results.set(name.trim().toLowerCase(), resolved.staffId)
  }

  return results
}

export async function resolveSpeciesBatch(
  supabase: SupabaseClient,
  rawNames: string[]
): Promise<Map<string, ResolvedSpecies>> {
  const results = new Map<string, ResolvedSpecies>()
  const unique = [...new Set(rawNames.map(n => n.trim()))]

  for (const name of unique) {
    const resolved = await resolveSpecies(supabase, name)
    results.set(name.trim().toLowerCase(), resolved)
  }

  return results
}

export async function resolveChemicalBatch(
  supabase: SupabaseClient,
  rawNames: string[]
): Promise<Map<string, ResolvedChemical>> {
  const results = new Map<string, ResolvedChemical>()
  const unique = [...new Set(rawNames.map(n => n.trim()))]

  for (const name of unique) {
    const resolved = await resolveChemical(supabase, name)
    results.set(name.trim().toLowerCase(), resolved)
  }

  return results
}
