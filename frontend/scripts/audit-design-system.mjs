import fs from 'node:fs'
import path from 'node:path'
import {
  collectMatches,
  compilePatterns,
  countVisualStyleProps,
  isRawColorException,
  readSourceFile,
  toSrcRelative,
  walkSourceFiles
} from './design-system-rules.mjs'

const baselinePath = path.join(process.cwd(), 'scripts', 'design-system-baseline.json')
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
const patterns = compilePatterns()

const totals = {
  hexAllowed: 0,
  hexBlocked: 0,
  rgbAllowed: 0,
  rgbBaselineTracked: 0,
  discouragedLegacyAliases: 0,
  removedLegacyAliases: 0
}

const hotspots = []
const baselineRegressions = []

for (const file of walkSourceFiles()) {
  const relPath = toSrcRelative(file)
  const source = readSourceFile(file)

  const hexColorCount = collectMatches(patterns.hexColor, source).length
  const rgbColorCount = collectMatches(patterns.rgbColor, source).length
  const discouragedLegacyAliasCount = collectMatches(patterns.discouragedLegacyAlias, source).length
  const removedLegacyAliasCount = collectMatches(patterns.removedLegacyAlias, source).length
  const visualPropCount = countVisualStyleProps(source, patterns.styleBlock)

  if (isRawColorException(relPath)) {
    totals.hexAllowed += hexColorCount
    totals.rgbAllowed += rgbColorCount
  } else {
    totals.hexBlocked += hexColorCount
    totals.rgbBaselineTracked += rgbColorCount
  }

  totals.discouragedLegacyAliases += discouragedLegacyAliasCount
  totals.removedLegacyAliases += removedLegacyAliasCount

  const aliasBaseline = baseline.discouragedLegacyAliasCounts[relPath] ?? 0
  const rgbBaseline = baseline.rgbColorCounts[relPath] ?? 0
  if (discouragedLegacyAliasCount > aliasBaseline) {
    baselineRegressions.push(`${relPath}: discouraged legacy alias usage increased from ${aliasBaseline} to ${discouragedLegacyAliasCount}`)
  }
  if (!isRawColorException(relPath) && rgbColorCount > rgbBaseline) {
    baselineRegressions.push(`${relPath}: raw rgb/rgba usage increased from ${rgbBaseline} to ${rgbColorCount}`)
  }

  const hotspotScore = hexColorCount + rgbColorCount + discouragedLegacyAliasCount + removedLegacyAliasCount + Math.floor(visualPropCount / 8)
  if (hotspotScore > 0) {
    hotspots.push({
      file: relPath,
      hotspotScore,
      hexColorCount,
      rgbColorCount,
      discouragedLegacyAliasCount,
      removedLegacyAliasCount,
      visualPropCount
    })
  }
}

console.log('Design-system audit')
console.log('')
console.log(`- blocked hex colors outside exceptions: ${totals.hexBlocked}`)
console.log(`- allowed hex colors in exceptions: ${totals.hexAllowed}`)
console.log(`- baseline-tracked rgb/rgba outside exceptions: ${totals.rgbBaselineTracked}`)
console.log(`- allowed rgb/rgba in exceptions: ${totals.rgbAllowed}`)
console.log(`- discouraged legacy alias usages: ${totals.discouragedLegacyAliases}`)
console.log(`- removed legacy alias usages: ${totals.removedLegacyAliases}`)

console.log('\nTop hotspots:')
for (const hotspot of hotspots.sort((a, b) => b.hotspotScore - a.hotspotScore).slice(0, 15)) {
  console.log(
    `- ${hotspot.file}: score=${hotspot.hotspotScore}, aliases=${hotspot.discouragedLegacyAliasCount}, rgb=${hotspot.rgbColorCount}, hex=${hotspot.hexColorCount}, inlineVisualProps=${hotspot.visualPropCount}`
  )
}

if (baselineRegressions.length > 0) {
  console.log('\nBaseline regressions:')
  for (const regression of baselineRegressions) {
    console.log(`- ${regression}`)
  }
  process.exitCode = 1
}
