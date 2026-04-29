import fs from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve(process.cwd())
const srcRoot = path.join(projectRoot, 'src')
const aliasRoots = ['app', 'core', 'features', 'components', 'layouts', 'pages', 'assets']
const fileExtensions = ['.ts', '.tsx']
const violations = []

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(target))
      continue
    }
    if (fileExtensions.includes(path.extname(entry.name))) {
      files.push(target)
    }
  }
  return files
}

function normalize(p) {
  return p.split(path.sep).join('/')
}

function toSrcRelative(file) {
  return normalize(path.relative(srcRoot, file))
}

function layerOf(file) {
  return toSrcRelative(file).split('/')[0] ?? ''
}

function featureKey(file) {
  const parts = toSrcRelative(file).split('/')
  if (parts[0] !== 'features') return ''
  return parts.slice(0, 2).join('/')
}

function parseImports(source) {
  const matches = []
  const importRe = /from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
  let match
  while ((match = importRe.exec(source))) {
    matches.push(match[1] ?? match[2])
  }
  return matches
}

function resolveImport(fromFile, specifier) {
  if (specifier.startsWith('@/')) {
    return path.join(srcRoot, specifier.slice(2))
  }
  if (specifier.startsWith('.')) {
    return path.resolve(path.dirname(fromFile), specifier)
  }
  return null
}

function resolveFile(resolvedBase) {
  const candidates = [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    path.join(resolvedBase, 'index.ts'),
    path.join(resolvedBase, 'index.tsx')
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

function isLegacyImport(specifier) {
  return (
    /^@\/(ui|modules|screens)(\/|$)/.test(specifier) ||
    specifier.includes('src/ui') ||
    specifier.includes('src/modules') ||
    specifier.includes('src/screens')
  )
}

function relativeDepth(specifier) {
  const matches = specifier.match(/\.\.\//g)
  return matches ? matches.length : 0
}

function aliasSuggestion(targetFile) {
  const relative = toSrcRelative(targetFile)
  const top = relative.split('/')[0]
  if (!aliasRoots.includes(top)) return null
  const withoutIndex = relative.replace(/\/index\.(ts|tsx)$/, '')
  const withoutExtension = withoutIndex.replace(/\.(ts|tsx)$/, '')
  return `@/${withoutExtension}`
}

function addViolation(file, message) {
  violations.push(`${toSrcRelative(file)}: ${message}`)
}

const files = walk(srcRoot)
const graph = new Map()

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const imports = parseImports(source)
  const resolvedDeps = []

  for (const specifier of imports) {
    if (isLegacyImport(specifier)) {
      addViolation(file, `legacy import path "${specifier}" is forbidden`)
    }

    const resolvedBase = resolveImport(file, specifier)
    if (!resolvedBase) continue

    const resolved = resolveFile(resolvedBase)
    if (!resolved || !resolved.startsWith(srcRoot)) continue
    resolvedDeps.push(resolved)

    const sourceLayer = layerOf(file)
    const targetLayer = layerOf(resolved)

    if (['ui', 'modules', 'screens'].includes(targetLayer)) {
      addViolation(file, `legacy import target "${specifier}" is forbidden`)
    }

    if (sourceLayer === 'features' && targetLayer === 'pages') {
      addViolation(file, `features must not import pages (${specifier})`)
    }
    if (sourceLayer === 'core' && (targetLayer === 'features' || targetLayer === 'pages')) {
      addViolation(file, `core must not import ${targetLayer} (${specifier})`)
    }
    if (sourceLayer === 'components' && targetLayer === 'pages') {
      addViolation(file, `components must not import pages (${specifier})`)
    }

    const suggestion = aliasSuggestion(resolved)
    if (specifier.startsWith('.') && suggestion && relativeDepth(specifier) >= 3) {
      const sameFeature = sourceLayer === 'features' && targetLayer === 'features' && featureKey(file) === featureKey(resolved)
      if (!sameFeature) {
        addViolation(file, `deep relative import "${specifier}" should use alias "${suggestion}"`)
      }
    }
  }

  graph.set(file, resolvedDeps)
}

const visited = new Set()
const visiting = new Set()
const stack = []
let cycle = null

function dfs(node) {
  if (cycle) return
  visiting.add(node)
  stack.push(node)

  for (const dep of graph.get(node) ?? []) {
    if (visiting.has(dep)) {
      const start = stack.indexOf(dep)
      cycle = stack.slice(start).concat(dep).map(toSrcRelative)
      return
    }
    if (!visited.has(dep)) dfs(dep)
  }

  visiting.delete(node)
  visited.add(node)
  stack.pop()
}

for (const file of files) {
  if (!visited.has(file)) dfs(file)
  if (cycle) break
}

if (cycle) {
  violations.push(`cycle detected: ${cycle.join(' -> ')}`)
}

if (violations.length > 0) {
  console.error('Architecture check failed:\n')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log('Architecture check passed.')
