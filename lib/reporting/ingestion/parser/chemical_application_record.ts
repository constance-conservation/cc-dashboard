/**
 * chemical_application_record.ts — Extract structured data from a Safety Culture
 * Chemical Application Record audit JSON.
 *
 * The CAR template uses positional matching: line N of "Chemical/s Used"
 * corresponds to line N of "Rate Used" and line N of "Concentrate used".
 */

import {
  ScAudit,
  findItem,
  findItemFuzzy,
  readText,
  readSelectedLabels,
  readFirstSelectedLabel,
  readDatetime,
  collectAllMedia,
  classifyMediaType,
} from './field_extractors'
import {
  parseTimeStartFinish,
  parseTotalAmountSprayed,
  parseRate,
} from './free_text_parsers'
import type {
  ExtractionResult,
  InspectionFields,
  PersonnelEntry,
  ChemicalEntry,
  MediaEntry,
  MetadataFields,
  ChemicalApplicationFields,
  ChemicalApplicationItem,
  ChemicalApplicationAdditive,
  ParsingWarning,
} from './types'

// ── Main extractor ───────────────────────────────────────────────────

export function extractChemicalApplicationRecord(audit: ScAudit): ExtractionResult {
  const warnings: ParsingWarning[] = []
  const allItems = [...audit.header_items, ...audit.items]

  const inspection = extractInspectionFields(audit, allItems, warnings)
  const personnel = extractOperatorsAsPersonnel(audit.items)
  const carFields = extractCARFields(audit, allItems, warnings)
  const chemicals = extractChemicals(carFields)
  const media = extractMedia(allItems)

  return {
    templateType: 'chemical_application_record',
    inspection,
    personnel,
    tasks: [],
    weeds: [],
    chemicals,
    media,
    observations: [],
    metadata: emptyMetadata(),
    chemicalApplicationRecord: carFields,
    parsingWarnings: warnings,
    rawJson: audit as unknown as Record<string, unknown>,
  }
}

// ── Inspection fields ────────────────────────────────────────────────

function extractInspectionFields(
  audit: ScAudit,
  allItems: ScAudit['header_items'],
  _warnings: ParsingWarning[]
): InspectionFields {
  const siteItem = findItem(allItems, 'Site treated', 'Site conducted')
  let siteName = readFirstSelectedLabel(siteItem)
  if (!siteName) {
    siteName = readText(siteItem)
  }
  if (siteName) siteName = siteName.trim()

  const conductedOnItem = findItem(allItems, 'Conducted on')
  const datetimeRaw = readDatetime(conductedOnItem)
  let date: string | null = null
  if (datetimeRaw) {
    date = datetimeRaw.substring(0, 10)
  }

  const supervisorItem = findItem(allItems, 'Prepared by', 'Prepared by/ Supervisor')
  const supervisorName = readFirstSelectedLabel(supervisorItem)

  return {
    scAuditId: audit.audit_id,
    scTemplateType: 'chemical_application_record',
    scModifiedAt: audit.modified_at,
    siteName,
    date,
    supervisorName,
  }
}

// ── Operators as personnel ───────────────────────────────────────────

function extractOperatorsAsPersonnel(items: ScAudit['items']): PersonnelEntry[] {
  const operatorsItem = findItem(items, 'Operator/Applicators Names')
  const names = readSelectedLabels(operatorsItem)

  return names.map(name => ({
    staffName: name,
    hoursWorked: null,
    rawHoursText: null,
  }))
}

// ── Chemical Application Record fields ───────────────────────────────

function extractCARFields(
  audit: ScAudit,
  allItems: ScAudit['header_items'],
  warnings: ParsingWarning[]
): ChemicalApplicationFields {
  const siteItem = findItem(allItems, 'Site treated', 'Site conducted')
  let siteName = readFirstSelectedLabel(siteItem)
  if (!siteName) siteName = readText(siteItem)
  if (siteName) siteName = siteName.trim()

  const conductedOnItem = findItem(allItems, 'Conducted on')
  const datetimeRaw = readDatetime(conductedOnItem)
  const date = datetimeRaw ? datetimeRaw.substring(0, 10) : null

  const methodItem = findItem(allItems, 'Application Method')
  const applicationMethod = readFirstSelectedLabel(methodItem)

  const timeItem = findItemFuzzy(allItems, 'Time Occurred Start/Finish')
  if (!timeItem) {
    findItemFuzzy(allItems, 'Time Start/Finish')
  }
  const timeRaw = readText(timeItem)
  const timeParsed = parseTimeStartFinish(timeRaw)

  const totalItem = findItemFuzzy(allItems, 'Total Amount Sprayed')
  const totalRaw = readText(totalItem)
  const totalLitres = parseTotalAmountSprayed(totalRaw)

  if (totalRaw && totalLitres === null) {
    warnings.push({
      field: 'chemicalApplicationRecord.totalAmountSprayed',
      message: `Could not parse total amount sprayed: "${totalRaw}"`,
      rawValue: totalRaw,
    })
  }

  const notifItem = findItem(allItems, 'Public Notification')
  const publicNotification = readFirstSelectedLabel(notifItem)

  const weatherGeneralItem = findItem(allItems, 'General Weather')
  const weatherGeneral = readFirstSelectedLabel(weatherGeneralItem)

  const windDirItem = findItem(allItems, 'Wind Direction')
  const windDirection = readFirstSelectedLabel(windDirItem)

  const windSpeedItem = findItemFuzzy(allItems, 'Wind Speed')
  const windSpeed = readText(windSpeedItem)

  const variabilityItem = findItemFuzzy(allItems, 'Variability')
  const windVariability = readText(variabilityItem)

  const rainfallItem = findItemFuzzy(allItems, 'Rainfall')
  const rainfall = readText(rainfallItem)

  const tempItem = findItem(allItems, 'Temperature')
  const temperature = readText(tempItem)

  const humidityItem = findItemFuzzy(allItems, 'Humidity')
  const humidity = readText(humidityItem)

  const chemicalsUsedItem = findItemFuzzy(allItems, 'Chemical/s Used')
  const rateUsedItem = findItemFuzzy(allItems, 'Rate Used')
  const concentrateItem = findItemFuzzy(allItems, 'Concentrate used')

  const chemicalsText = readText(chemicalsUsedItem)
  const rateText = readText(rateUsedItem)
  const concentrateText = readText(concentrateItem)

  const chemicalLines = splitLines(chemicalsText)
  const rateLines = splitLines(rateText)
  const concentrateLines = splitLines(concentrateText)

  const items: ChemicalApplicationItem[] = []
  const maxLen = Math.max(chemicalLines.length, rateLines.length, concentrateLines.length)

  for (let i = 0; i < maxLen; i++) {
    const chemName = chemicalLines[i] ?? null
    if (!chemName) {
      warnings.push({
        field: 'chemicalApplicationRecord.items',
        message: `Rate/concentrate line ${i + 1} has no corresponding chemical name`,
      })
      continue
    }

    const rateLine = rateLines[i] ?? null
    const concentrateLine = concentrateLines[i] ?? null
    const parsedRate = parseRate(rateLine)

    items.push({
      chemicalNameRaw: chemName,
      rateRaw: rateLine,
      rateValue: parsedRate.value,
      rateUnit: parsedRate.unit,
      concentrateRaw: concentrateLine,
    })
  }

  if (chemicalLines.length !== rateLines.length && rateLines.length > 0) {
    warnings.push({
      field: 'chemicalApplicationRecord.items',
      message: `Chemical line count (${chemicalLines.length}) does not match rate line count (${rateLines.length})`,
    })
  }

  const operatorsItem = findItem(allItems, 'Operator/Applicators Names')
  const operatorNames = readSelectedLabels(operatorsItem)

  const additivesItem = findItem(allItems, 'Additives or Wetters')
  const additiveLabels = readSelectedLabels(additivesItem)
  const additives: ChemicalApplicationAdditive[] = additiveLabels.map(label => {
    const rateMatch = label.match(/(\d+(?:\.\d+)?)\s*(ml\/L|g\/L)/i)
    return {
      additiveName: label,
      rateRaw: rateMatch ? rateMatch[0] : null,
    }
  })

  return {
    scAuditId: audit.audit_id,
    siteName,
    date,
    applicationMethod,
    timeStart: timeParsed.start,
    timeFinish: timeParsed.finish,
    totalAmountSprayedLitres: totalLitres,
    weatherGeneral,
    windDirection,
    windSpeed,
    windVariability,
    rainfall,
    temperature,
    humidity,
    publicNotification,
    items,
    operatorNames,
    additives,
  }
}

function extractChemicals(carFields: ChemicalApplicationFields): ChemicalEntry[] {
  return carFields.items.map(item => ({
    chemicalNameRaw: item.chemicalNameRaw,
    rateRaw: item.rateRaw,
    rateValue: item.rateValue,
    rateUnit: item.rateUnit,
    sourceTemplate: 'chemical_application_record' as const,
  }))
}

function extractMedia(allItems: ScAudit['header_items']): MediaEntry[] {
  const collected = collectAllMedia(allItems)
  return collected.map(m => ({
    scMediaHref: m.href,
    mediaType: classifyMediaType(m.parentItemLabel),
    gpsLat: null,
    gpsLon: null,
    beforeAfter: null,
  }))
}

function splitLines(text: string | null): string[] {
  if (!text) return []
  return text.split('\n').map(l => l.trim()).filter(l => l !== '')
}

function emptyMetadata(): MetadataFields {
  return {
    totalWorkedHours: null,
    remainingHours: null,
    weedRemovalPctMin: null,
    weedRemovalPctMax: null,
    erosionWorks: null,
    concernsText: null,
    futureWorksComments: null,
  }
}
