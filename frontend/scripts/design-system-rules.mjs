import fs from 'node:fs'
import path from 'node:path'

export const projectRoot = path.resolve(process.cwd())
export const srcRoot = path.join(projectRoot, 'src')
export const scanDirectories = ['app', 'components', 'features', 'layouts', 'pages']
export const fileExtensions = new Set(['.ts', '.tsx'])
export const removedLegacyAliases = ['background', 'danger', 'secondarySoft', 'primaryHover', 'secondaryMedium', 'surfaceAlt']
export const discouragedLegacyAliases = ['primary', 'secondary', 'surface', 'border']
export const visualStyleProps = ['background', 'border', 'borderColor', 'color', 'boxShadow', 'fill', 'stroke']

export const rawColorExceptionPrefixes = ['app/theme/']
export const rawColorExceptionFiles = new Set([
  'components/primitives/Modal/ConfirmDialog.tsx',
  'components/primitives/Modal/index.tsx',
  'features/ecosystem/components/EcosystemExperience.tsx'
])

export function normalize(p) {
  return p.split(path.sep).join('/')
}

export function toSrcRelative(file) {
  return normalize(path.relative(srcRoot, file))
}

export function walkSourceFiles() {
  const files = []

  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        visit(target)
        continue
      }
      if (fileExtensions.has(path.extname(entry.name))) {
        files.push(target)
      }
    }
  }

  for (const directory of scanDirectories) {
    visit(path.join(srcRoot, directory))
  }

  return files
}

export function readSourceFile(file) {
  return fs.readFileSync(file, 'utf8')
}

export function matchesAnyPrefix(relPath, prefixes) {
  return prefixes.some((prefix) => relPath.startsWith(prefix))
}

export function isRawColorException(relPath) {
  return matchesAnyPrefix(relPath, rawColorExceptionPrefixes) || rawColorExceptionFiles.has(relPath)
}

export function compilePatterns() {
  return {
    hexColor: /#[0-9A-Fa-f]{3,8}\b/g,
    rgbColor: /rgba?\(/g,
    removedLegacyAlias: /theme\.colors\.(background|danger|secondarySoft|primaryHover|secondaryMedium|surfaceAlt)\b/g,
    discouragedLegacyAlias: /theme\.colors\.(primary|secondary|surface|border)\b/g,
    styleBlock: /style=\{\{([\s\S]*?)\}\}/g
  }
}

export function collectMatches(pattern, source) {
  return Array.from(source.matchAll(pattern))
}

export function countVisualStyleProps(source, styleBlockPattern) {
  let total = 0
  for (const [, styleBlock] of source.matchAll(styleBlockPattern)) {
    total += visualStyleProps.reduce((count, property) => count + (styleBlock.match(new RegExp(`\\b${property}\\s*:`, 'g'))?.length ?? 0), 0)
  }
  return total
}
