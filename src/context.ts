import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export class ContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContextError'
  }
}

export interface GatheredContext {
  version: string
  changelog: string
  readme: string
  commits: string[]
  manifest?: {
    schema: string
    version: string
    repo?: string
    tagged_at?: string
    registries?: Array<Record<string, unknown>>
  }
}

const README_MAX = 2000

export function gatherContext(
  cwd: string,
  version: string,
  opts: { manifestPath?: string } = {},
): GatheredContext {
  const changelogPath = join(cwd, 'CHANGELOG.md')
  if (!existsSync(changelogPath)) {
    throw new ContextError(`CHANGELOG.md not found at ${changelogPath}`)
  }
  const changelog = extractChangelogSection(readFileSync(changelogPath, 'utf8'), version)

  const readmePath = join(cwd, 'README.md')
  if (!existsSync(readmePath)) {
    throw new ContextError(`README.md not found at ${readmePath}`)
  }
  const readme = readFileSync(readmePath, 'utf8').slice(0, README_MAX)

  const commits = readRecentCommits(cwd, 50)

  const result: GatheredContext = { version, changelog, readme, commits }

  if (opts.manifestPath) {
    if (!existsSync(opts.manifestPath)) {
      throw new ContextError(`manifest file not found: ${opts.manifestPath}`)
    }
    try {
      result.manifest = JSON.parse(readFileSync(opts.manifestPath, 'utf8'))
    } catch (err) {
      throw new ContextError(
        `failed to parse manifest at ${opts.manifestPath}: ${(err as Error).message}`,
      )
    }
  }

  return result
}

function extractChangelogSection(content: string, version: string): string {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|$(?![\\r\\n]))`,
    'm',
  )
  const match = content.match(re)
  if (!match || match[1] === undefined) {
    throw new ContextError(`version ${version} not found in CHANGELOG.md`)
  }
  return match[1].trim()
}

function readRecentCommits(cwd: string, limit: number): string[] {
  const r = spawnSync('git', ['log', '--pretty=format:%h %s', `-${limit}`], {
    cwd,
    encoding: 'utf8',
  })
  if ((r.status ?? -1) !== 0) {
    return []
  }
  return (r.stdout ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}
