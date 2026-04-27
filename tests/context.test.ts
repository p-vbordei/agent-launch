import { describe, expect, test } from 'bun:test'
import { gatherContext, ContextError } from '../src/context'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function git(args: string[], cwd: string) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if ((r.status ?? -1) !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`)
  }
  return r.stdout?.trim() ?? ''
}

function setupRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'al-ctx-'))
  git(['init', '-b', 'main'], dir)
  git(['config', 'user.email', 't@example.com'], dir)
  git(['config', 'user.name', 'T'], dir)
  writeFileSync(
    join(dir, 'README.md'),
    '# agent-id\n\nMachine-first identity for AI agents.\n',
  )
  writeFileSync(
    join(dir, 'CHANGELOG.md'),
    `# Changelog\n\n## [0.2.0] - 2026-04-27\n\n### Added\n- batch verification\n\n## [0.1.0] - 2026-04-20\n\n### Added\n- initial release\n`,
  )
  git(['add', '.'], dir)
  git(['commit', '-m', 'feat: batch verification'], dir)
  writeFileSync(join(dir, 'README.md'), '# agent-id\n\nMachine-first identity. Updated.\n')
  git(['add', '.'], dir)
  git(['commit', '-m', 'docs: update README'], dir)
  return dir
}

describe('gatherContext', () => {
  test('extracts CHANGELOG section, README, and recent commits', () => {
    const dir = setupRepo()
    try {
      const ctx = gatherContext(dir, '0.2.0')
      expect(ctx.changelog).toContain('batch verification')
      expect(ctx.changelog).not.toContain('## [0.1.0]')
      expect(ctx.readme).toContain('Machine-first identity')
      expect(ctx.commits.length).toBeGreaterThanOrEqual(2)
      expect(ctx.commits.some((c) => c.includes('batch verification'))).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('throws if version not in CHANGELOG', () => {
    const dir = setupRepo()
    try {
      expect(() => gatherContext(dir, '9.9.9')).toThrow(ContextError)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('throws if README missing', () => {
    const dir = setupRepo()
    try {
      rmSync(join(dir, 'README.md'))
      expect(() => gatherContext(dir, '0.2.0')).toThrow(/README/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('truncates README to 2000 chars', () => {
    const dir = setupRepo()
    try {
      writeFileSync(join(dir, 'README.md'), 'a'.repeat(5000))
      const ctx = gatherContext(dir, '0.2.0')
      expect(ctx.readme.length).toBeLessThanOrEqual(2000)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('reads optional manifest if present', () => {
    const dir = setupRepo()
    const manifestPath = join(dir, 'release-manifest.json')
    writeFileSync(
      manifestPath,
      JSON.stringify({
        schema: 'agent-publish/release-manifest/v1',
        version: '0.2.0',
      }),
    )
    try {
      const ctx = gatherContext(dir, '0.2.0', { manifestPath })
      expect(ctx.manifest).toBeDefined()
      expect(ctx.manifest?.version).toBe('0.2.0')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
