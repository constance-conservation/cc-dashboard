'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { ReportDetail } from '@/lib/reporting/types'
import { saveReportEdits, uploadReportImage } from './actions'

type SlotType = 'location_map' | 'period_map'

const EDIT_STYLE_ID = '__edit_mode_style__'

const editModeCss = `
body { outline: 2px dashed var(--accent, #B07D4F); outline-offset: -2px; }
body [contenteditable="true"]:focus, body:focus { outline: 2px solid var(--accent, #B07D4F); background: #FFFDF5; }
figure[data-placeholder] { position: relative; cursor: pointer; }
figure[data-placeholder].drop-hover { outline: 3px dashed #D4A574; outline-offset: -3px; background: #FFF7E6; }
figure[data-placeholder].drop-hover::after {
  content: 'Drop image here';
  position: absolute; top: 8px; left: 8px;
  background: #B07D4F; color: #fff; padding: 4px 10px;
  font: 600 12px/1 system-ui, sans-serif; border-radius: 4px;
  pointer-events: none;
}
figure[data-placeholder].drop-uploading { opacity: 0.6; }
figure[data-placeholder] .drop-error {
  position: absolute; bottom: 8px; left: 8px; right: 8px;
  background: #C75146; color: #fff; padding: 6px 10px;
  font: 500 12px/1.3 system-ui, sans-serif; border-radius: 4px;
}
`

function slotTypeFromPlaceholder(placeholder: string | null): SlotType | null {
  if (!placeholder) return null
  if (placeholder.startsWith('location_map')) return 'location_map'
  if (placeholder.startsWith('period_map')) return 'period_map'
  return null
}

function collectUploadedImageUrls(doc: Document): {
  location: string[] | null
  period: string[] | null
} {
  const slots = doc.querySelectorAll('figure[data-placeholder]')
  const location: Record<number, string> = {}
  const period: Record<number, string> = {}
  slots.forEach(fig => {
    const slot = fig.getAttribute('data-placeholder') || ''
    const img = fig.querySelector('img')
    if (!img || !img.getAttribute('src')) return
    const m = slot.match(/^(location_map|period_map)_(\d+)$/)
    if (!m) return
    const idx = parseInt(m[2], 10)
    const src = img.getAttribute('src') || ''
    if (m[1] === 'location_map') location[idx] = src
    else period[idx] = src
  })
  const toArray = (obj: Record<number, string>): string[] | null => {
    const keys = Object.keys(obj).map(Number).sort((a, b) => a - b)
    if (keys.length === 0) return null
    return keys.map(k => obj[k])
  }
  return { location: toArray(location), period: toArray(period) }
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 500,
  border: '1px solid var(--line)',
  borderRadius: 6,
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  textDecoration: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const buttonStyleDisabled: React.CSSProperties = {
  ...buttonStyle,
  color: 'var(--ink-3)',
  cursor: 'not-allowed',
  opacity: 0.5,
  background: 'var(--bg-sunken)',
}

const buttonStylePrimary: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--accent, #B07D4F)',
  borderColor: 'var(--accent, #B07D4F)',
  color: '#fff',
}

export function ReportEditor({ report }: { report: ReportDetail }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const dropZonesAttachedRef = useRef(false)
  const inputListenerAttachedRef = useRef(false)
  const [editable, setEditable] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ text: string; tone: 'idle' | 'saving' | 'saved' | 'error' }>({ text: '', tone: 'idle' })
  const [isPending, startTransition] = useTransition()

  const html = report.htmlContent || '<p style="padding:40px;text-align:center;color:#888;font-family:system-ui,sans-serif">No html_content stored on this report row.</p>'

  const handleUpload = async (fig: Element, file: File) => {
    const placeholder = fig.getAttribute('data-placeholder') || ''
    const type = slotTypeFromPlaceholder(placeholder)
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    if (!type) {
      showFigureError(doc, fig, `Unknown slot: ${placeholder}`)
      return
    }
    if (!report.clientId) {
      showFigureError(doc, fig, 'Missing clientId on report')
      return
    }
    clearFigureError(fig)
    fig.classList.add('drop-uploading')
    try {
      const formData = new FormData()
      formData.append('reportId', report.id)
      formData.append('clientId', report.clientId)
      formData.append('type', type)
      formData.append('file', file)
      const result = await uploadReportImage(formData)
      if (!result.ok) {
        showFigureError(doc, fig, result.error)
        return
      }
      replaceFigureWithImage(doc, fig, result.url, placeholder, handleUpload)
      setDirty(true)
      setStatusMsg({ text: '• unsaved changes', tone: 'idle' })
    } catch (err) {
      showFigureError(doc, fig, err instanceof Error ? err.message : String(err))
    } finally {
      fig.classList.remove('drop-uploading')
    }
  }

  const applyEditMode = (turnOn: boolean) => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!iframe || !doc || !doc.body) return

    doc.body.contentEditable = turnOn ? 'true' : 'false'

    let styleEl = doc.getElementById(EDIT_STYLE_ID) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = doc.createElement('style')
      styleEl.id = EDIT_STYLE_ID
      doc.head.appendChild(styleEl)
    }
    styleEl.textContent = turnOn ? editModeCss : ''

    if (turnOn && !inputListenerAttachedRef.current) {
      doc.body.addEventListener('input', () => {
        setDirty(true)
        setStatusMsg({ text: '• unsaved changes', tone: 'idle' })
      })
      inputListenerAttachedRef.current = true
    }

    if (turnOn && !dropZonesAttachedRef.current) {
      wireDropZones(doc, handleUpload)
      dropZonesAttachedRef.current = true
    }
  }

  useEffect(() => {
    applyEditMode(editable)
  }, [editable])

  const handleSave = () => {
    if (!dirty || isPending) return
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc) return

    const styleEl = doc.getElementById(EDIT_STYLE_ID)
    if (styleEl) styleEl.remove()
    doc.querySelectorAll('figure[data-placeholder]').forEach(f => {
      f.classList.remove('drop-hover', 'drop-uploading')
      f.querySelectorAll('.drop-error').forEach(e => e.remove())
    })

    const htmlOut = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
    const urls = collectUploadedImageUrls(doc)

    setStatusMsg({ text: 'saving…', tone: 'saving' })

    startTransition(async () => {
      const result = await saveReportEdits({
        reportId: report.id,
        clientId: report.clientId,
        htmlContent: htmlOut,
        periodMapImages: urls.period,
        locationMaps: urls.location,
      })

      if (result.ok) {
        setDirty(false)
        setStatusMsg({ text: 'saved ✓', tone: 'saved' })
        applyEditMode(editable)
        setTimeout(() => {
          setStatusMsg(prev => prev.tone === 'saved' ? { text: '', tone: 'idle' } : prev)
        }, 1800)
      } else {
        setStatusMsg({ text: `save failed: ${result.error}`, tone: 'error' })
      }
    })
  }

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  const statusColor =
    statusMsg.tone === 'saved'
      ? 'var(--ok, #5b8a72)'
      : statusMsg.tone === 'error'
      ? 'var(--terracotta, #C75146)'
      : statusMsg.tone === 'saving'
      ? 'var(--ink-2)'
      : 'var(--ink-3)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          flexWrap: 'wrap',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={editable}
            onChange={e => setEditable(e.target.checked)}
          />
          Edit mode
        </label>
        <span style={{ fontSize: 12, color: statusColor }}>{statusMsg.text}</span>
        <div style={{ flex: 1 }} />
        {report.pdfUrl ? (
          <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer" style={buttonStyle}>Open PDF</a>
        ) : (
          <span style={buttonStyleDisabled} title="PDF not yet generated">Open PDF</span>
        )}
        {report.docxUrl ? (
          <a href={report.docxUrl} download style={buttonStyle}>Download DOCX</a>
        ) : (
          <span style={buttonStyleDisabled} title="DOCX not yet generated">Download DOCX</span>
        )}
        <button type="button" onClick={handlePrint} style={buttonStyle}>Print to PDF</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isPending}
          style={dirty && !isPending ? buttonStylePrimary : buttonStyleDisabled}
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <iframe
        ref={iframeRef}
        srcDoc={html}
        title={report.title || 'Report preview'}
        style={{
          width: '100%',
          height: 'calc(100vh - 220px)',
          minHeight: 600,
          border: '1px solid var(--line)',
          borderRadius: 8,
          background: '#fff',
        }}
        onLoad={() => {
          dropZonesAttachedRef.current = false
          inputListenerAttachedRef.current = false
          applyEditMode(editable)
        }}
      />
    </div>
  )
}

function wireDropZones(
  doc: Document,
  onFile: (fig: Element, file: File) => Promise<void>,
) {
  const slots = doc.querySelectorAll('figure[data-placeholder][data-editable="true"]')
  slots.forEach(fig => attachDropHandlers(doc, fig, onFile))
}

function attachDropHandlers(
  doc: Document,
  fig: Element,
  onFile: (fig: Element, file: File) => Promise<void>,
) {
  const stop = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
  }
  fig.addEventListener('dragenter', e => {
    stop(e)
    fig.classList.add('drop-hover')
  })
  fig.addEventListener('dragover', e => {
    stop(e)
    const dt = (e as DragEvent).dataTransfer
    if (dt) dt.dropEffect = 'copy'
    fig.classList.add('drop-hover')
  })
  fig.addEventListener('dragleave', e => {
    stop(e)
    if (e.target === fig) fig.classList.remove('drop-hover')
  })
  fig.addEventListener('drop', async e => {
    stop(e)
    fig.classList.remove('drop-hover')
    const file = (e as DragEvent).dataTransfer?.files?.[0]
    if (!file) return
    await onFile(fig, file)
  })
  fig.addEventListener('click', () => {
    const input = doc.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) await onFile(fig, file)
    }
    input.click()
  })
}

function replaceFigureWithImage(
  doc: Document,
  fig: Element,
  url: string,
  placeholder: string,
  onFile: (fig: Element, file: File) => Promise<void>,
) {
  const caption = fig.querySelector('figcaption')
  const newFig = doc.createElement('figure')
  newFig.setAttribute('data-placeholder', placeholder)
  newFig.setAttribute('data-editable', 'true')
  newFig.setAttribute('data-img-source', 'upload')
  const img = doc.createElement('img')
  img.src = url
  img.alt = placeholder
  img.style.maxWidth = '100%'
  newFig.appendChild(img)
  if (caption) newFig.appendChild(caption.cloneNode(true))
  fig.replaceWith(newFig)
  attachDropHandlers(doc, newFig, onFile)
}

function showFigureError(doc: Document, fig: Element, msg: string) {
  clearFigureError(fig)
  const div = doc.createElement('div')
  div.className = 'drop-error'
  div.textContent = msg
  fig.appendChild(div)
  setTimeout(() => clearFigureError(fig), 6000)
}

function clearFigureError(fig: Element) {
  fig.querySelectorAll('.drop-error').forEach(e => e.remove())
}
