import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(new URL('..', import.meta.url).pathname)
const rawDir = resolve(repoRoot, '.coverage_raw')

rmSync(rawDir, { recursive: true, force: true })

const testRun = spawnSync('npm', ['test', '--', '--run'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, NODE_V8_COVERAGE: rawDir },
})

if (testRun.status !== 0) {
  process.exit(testRun.status ?? 1)
}

const files = readdirSync(rawDir).filter((file) => file.endsWith('.json'))
const coverageByFile = new Map()

for (const file of files) {
  const payload = JSON.parse(readFileSync(resolve(rawDir, file), 'utf8'))
  for (const script of payload.result) {
    const url = script.url ?? ''
    if (!url.startsWith('file://')) continue
    const absPath = new URL(url).pathname
    if (!absPath.startsWith(resolve(repoRoot, 'src') + '/')) continue
    if (!absPath.endsWith('.js')) continue

    const entry = coverageByFile.get(absPath) ?? { all: [], hit: [] }
    for (const fn of script.functions ?? []) {
      for (const range of fn.ranges ?? []) {
        if (range.endOffset <= range.startOffset) continue
        entry.all.push([range.startOffset, range.endOffset])
        if (range.count > 0) entry.hit.push([range.startOffset, range.endOffset])
      }
    }
    coverageByFile.set(absPath, entry)
  }
}

function mergeRanges(ranges) {
  if (ranges.length === 0) return []
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged = [ranges[0].slice()]
  for (let i = 1; i < ranges.length; i += 1) {
    const [start, end] = ranges[i]
    const last = merged[merged.length - 1]
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end)
    } else {
      merged.push([start, end])
    }
  }
  return merged
}

function rangeSize(ranges) {
  return ranges.reduce((sum, [s, e]) => sum + (e - s), 0)
}

const summary = []
for (const [filePath, entry] of [...coverageByFile.entries()].sort()) {
  const all = mergeRanges(entry.all)
  const hit = mergeRanges(entry.hit)
  const totalBytes = rangeSize(all)
  const coveredBytes = rangeSize(hit)
  const pct = totalBytes === 0 ? 100 : (coveredBytes / totalBytes) * 100
  summary.push({ filePath, pct })
}

if (summary.length === 0) {
  console.error('No JavaScript source files were discovered in V8 coverage output.')
  process.exit(1)
}

let failed = false
for (const row of summary) {
  const rel = relative(repoRoot, row.filePath)
  const rendered = row.pct.toFixed(2)
  console.log(`${rel}: ${rendered}%`)
  if (row.pct < 100) failed = true
}

const overall = summary.reduce((sum, row) => sum + row.pct, 0) / summary.length
console.log(`Overall (src/**/*.js): ${overall.toFixed(2)}%`)

if (failed) {
  console.error('Coverage is below 100% for one or more JavaScript source files.')
  process.exit(1)
}
