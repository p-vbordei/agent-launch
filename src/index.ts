import { resolve } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadLaunchConfig, LaunchConfigError, type Platform } from './config'
import { gatherContext, ContextError } from './context'
import type { DraftDeps, DraftResult } from './draft'

function usage(): never {
  console.error('Usage: agent-launch <draft|context> <version> [args]')
  process.exit(64)
}

function getFlag(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i > -1 ? process.argv[i + 1] : undefined
}

function filenameFor(platform: Platform, outDir: string): string {
  if (platform.kind === 'reddit') return resolve(outDir, `reddit-${platform.subreddit}.md`)
  return resolve(outDir, `${platform.kind}.md`)
}

function renderDraftFile(result: DraftResult): string {
  const fm: Record<string, string | number | boolean> = {
    platform: result.platform,
    generated_at: new Date().toISOString(),
    length_chars: result.length,
    length_cap: result.length_cap,
    capped: result.capped,
  }
  if (result.title !== undefined) fm['title'] = result.title
  if (result.tweet_count !== undefined) fm['tweet_count'] = result.tweet_count
  const fmYaml = Object.entries(fm)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`)
    .join('\n')
  return `---\n${fmYaml}\n---\n\n${result.body}\n`
}

async function main() {
  const [, , cmd, version] = process.argv
  if (!cmd) usage()

  const cwd = process.cwd()
  let cfg
  try {
    cfg = loadLaunchConfig(resolve(cwd, 'launch.yaml'))
  } catch (err) {
    if (err instanceof LaunchConfigError) {
      console.error(err.message)
      process.exit(1)
    }
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`launch.yaml not found at ${resolve(cwd, 'launch.yaml')}`)
      process.exit(1)
    }
    throw err
  }

  if (cmd === 'context') {
    if (!version) {
      console.error('context requires <version>')
      process.exit(1)
    }
    try {
      const manifestPath = cfg.context.manifest
        ? resolve(cwd, cfg.context.manifest)
        : undefined
      const ctx = gatherContext(cwd, version, manifestPath ? { manifestPath } : {})
      console.log(JSON.stringify(ctx, null, 2))
      process.exit(0)
    } catch (err) {
      if (err instanceof ContextError) {
        console.error(err.message)
        process.exit(1)
      }
      throw err
    }
  }

  if (cmd === 'draft') {
    if (!version) {
      console.error('draft requires <version>')
      process.exit(1)
    }
    const platformsArg = getFlag('--platforms')
    const outArg = getFlag('--out') ?? `launches/v${version}`

    // S5: --out must resolve under cwd, no .. traversal, no absolute outside cwd.
    const outAbs = resolve(cwd, outArg)
    if (!outAbs.startsWith(`${cwd}/`) && outAbs !== cwd) {
      console.error(`--out must resolve to a path inside ${cwd}`)
      process.exit(1)
    }

    let ctx
    try {
      const manifestPath = cfg.context.manifest
        ? resolve(cwd, cfg.context.manifest)
        : undefined
      ctx = gatherContext(cwd, version, manifestPath ? { manifestPath } : {})
    } catch (err) {
      if (err instanceof ContextError) {
        console.error(err.message)
        process.exit(2)
      }
      throw err
    }

    const apiKey = process.env['ANTHROPIC_API_KEY']
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set')
      process.exit(3)
    }

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const { draftOne } = await import('./draft')
    const client = new Anthropic({ apiKey })
    const filterKinds = platformsArg
      ? new Set(platformsArg.split(',').map((s) => s.trim()))
      : null
    const targets = cfg.platforms.filter(
      (p) => filterKinds === null || filterKinds.has(p.kind),
    )
    if (targets.length === 0) {
      console.error('no platforms match the --platforms filter')
      process.exit(1)
    }

    mkdirSync(outAbs, { recursive: true })
    const summary: Array<{ kind: string; file: string; capped: boolean }> = []
    for (const platform of targets) {
      const result: DraftResult = await draftOne({
        platform,
        project: cfg.project,
        context: { ...ctx, repo: cfg.context.repo },
        deps: { anthropic: client as unknown as DraftDeps['anthropic'] },
      })
      const file = filenameFor(platform, outAbs)
      writeFileSync(file, renderDraftFile(result))
      summary.push({ kind: platform.kind, file, capped: result.capped })
    }
    console.log(`Drafted ${summary.length} posts for v${version} in ${outAbs}`)
    for (const s of summary) {
      console.log(`  - ${s.kind}: ${s.file}${s.capped ? '' : '  (over length cap)'}`)
    }
    process.exit(0)
  }

  usage()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
