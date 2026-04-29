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

const blockingViolations = []
const warnings = []
const baselineDrift = []

function addBlockingViolation(file, message) {
  blockingViolations.push(`${file}: ${message}`)
}

function addWarning(file, message) {
  warnings.push(`${file}: ${message}`)
}

function compareAgainstBaseline(file, category, count, baselineMap) {
  const allowed = baselineMap[file] ?? 0
  if (count > allowed) {
    addBlockingViolation(file, `${category} increased from baseline ${allowed} to ${count}`)
    return
  }

  if (allowed > 0 && count < allowed) {
    baselineDrift.push(`${file}: ${category} dropped from baseline ${allowed} to ${count}; consider updating scripts/design-system-baseline.json`)
  }
}

for (const file of walkSourceFiles()) {
  const relPath = toSrcRelative(file)
  const source = readSourceFile(file)

  const removedLegacyAliasCount = collectMatches(patterns.removedLegacyAlias, source).length
  if (removedLegacyAliasCount > 0) {
    addBlockingViolation(relPath, `removed legacy aliases found (${removedLegacyAliasCount})`)
  }

  const discouragedLegacyAliasCount = collectMatches(patterns.discouragedLegacyAlias, source).length
  compareAgainstBaseline(relPath, 'discouraged legacy alias usage', discouragedLegacyAliasCount, baseline.discouragedLegacyAliasCounts)

  const hexColorCount = collectMatches(patterns.hexColor, source).length
  if (hexColorCount > 0 && !isRawColorException(relPath)) {
    addBlockingViolation(relPath, `hardcoded hex colors found (${hexColorCount})`)
  }

  const rgbColorCount = collectMatches(patterns.rgbColor, source).length
  if (isRawColorException(relPath)) {
    if (rgbColorCount > 0) {
      addWarning(relPath, `raw rgb/rgba colors allowed by exception (${rgbColorCount})`)
    }
  } else {
    compareAgainstBaseline(relPath, 'raw rgb/rgba usage', rgbColorCount, baseline.rgbColorCounts)
  }

  const visualPropCount = countVisualStyleProps(source, patterns.styleBlock)
  if (visualPropCount >= 16 && !isRawColorException(relPath) && !relPath.startsWith('components/primitives/')) {
    addWarning(relPath, `high inline visual style count (${visualPropCount}); consider moving styling into tokens or primitives`)
  }
}

if (blockingViolations.length > 0) {
  console.error('Design-system guardrails failed:\n')
  for (const violation of blockingViolations) {
    console.error(`- ${violation}`)
  }
  if (warnings.length > 0) {
    console.error('\nWarnings:\n')
    for (const warning of warnings) {
      console.error(`- ${warning}`)
    }
  }
  if (baselineDrift.length > 0) {
    console.error('\nBaseline drift:\n')
    for (const drift of baselineDrift) {
      console.error(`- ${drift}`)
    }
  }
  process.exit(1)
}

console.log('Design-system guardrails passed.')

if (warnings.length > 0) {
  console.log('\nWarnings:')
  for (const warning of warnings) {
    console.log(`- ${warning}`)
  }
}

if (baselineDrift.length > 0) {
  console.log('\nBaseline drift:')
  for (const drift of baselineDrift) {
    console.log(`- ${drift}`)
  }
}
