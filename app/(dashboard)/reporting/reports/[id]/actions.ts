'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const IMAGE_MIME_ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp'])
const IMAGE_MAX_BYTES = 10 * 1024 * 1024

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (/^(png|jpe?g|webp)$/.test(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export async function uploadReportImage(formData: FormData): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string }
> {
  const reportId = formData.get('reportId')
  const clientId = formData.get('clientId')
  const type = formData.get('type')
  const file = formData.get('file')

  if (typeof reportId !== 'string' || !UUID_RE.test(reportId)) {
    return { ok: false, error: 'Invalid reportId' }
  }
  if (typeof clientId !== 'string' || !UUID_RE.test(clientId)) {
    return { ok: false, error: 'Invalid clientId' }
  }
  if (type !== 'location_map' && type !== 'period_map') {
    return { ok: false, error: 'Invalid slot type' }
  }
  if (!(file instanceof File)) {
    return { ok: false, error: 'No file provided' }
  }
  if (!IMAGE_MIME_ALLOWED.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type || 'unknown'}. Use PNG, JPEG or WebP.` }
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.` }
  }

  const ext = extFromFile(file)
  const path = `${clientId}/${type}/${type}_${Date.now()}.${ext}`

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Admin client init failed' }
  }

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('report_assets')
    .upload(path, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) return { ok: false, error: `Upload failed: ${uploadErr.message}` }

  const { data: pub } = admin.storage.from('report_assets').getPublicUrl(path)
  return { ok: true, url: pub.publicUrl }
}

export async function saveReportEdits(args: {
  reportId: string
  clientId: string | null
  htmlContent: string
  periodMapImages: string[] | null
  locationMaps: string[] | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { reportId, clientId, htmlContent, periodMapImages, locationMaps } = args

  if (!UUID_RE.test(reportId)) return { ok: false, error: 'Invalid reportId' }
  if (clientId !== null && !UUID_RE.test(clientId)) {
    return { ok: false, error: 'Invalid clientId' }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Admin client init failed' }
  }

  const reportPatch: Record<string, unknown> = {
    html_content: htmlContent,
    updated_at: new Date().toISOString(),
  }
  if (periodMapImages && periodMapImages.length > 0) {
    reportPatch.period_map_images = periodMapImages
  }

  const { error: reportErr } = await admin
    .from('client_reports')
    .update(reportPatch)
    .eq('id', reportId)

  if (reportErr) return { ok: false, error: `Report update failed: ${reportErr.message}` }

  if (clientId && locationMaps && locationMaps.length > 0) {
    const { data: existing, error: fetchErr } = await admin
      .from('clients')
      .select('location_maps')
      .eq('id', clientId)
      .maybeSingle()

    if (fetchErr) return { ok: false, error: `Client fetch failed: ${fetchErr.message}` }

    const current = Array.isArray(existing?.location_maps) ? existing!.location_maps as string[] : []
    const changed =
      current.length !== locationMaps.length ||
      current.some((url, i) => url !== locationMaps[i])

    if (changed) {
      const { error: clientErr } = await admin
        .from('clients')
        .update({ location_maps: locationMaps })
        .eq('id', clientId)
      if (clientErr) return { ok: false, error: `Client update failed: ${clientErr.message}` }
    }
  }

  revalidatePath(`/reporting/reports/${reportId}`)
  revalidatePath('/reporting/reports')
  return { ok: true }
}
