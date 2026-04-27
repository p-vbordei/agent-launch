import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CLI = resolve(import.meta.dir, '..', 'src', 'index.ts')

function git(args: string[], cwd: string) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if ((r.status ?? -1) !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout?.trim() ?? ''
}

function runCli(args: string[], cwd: string) {
  const r = spawnSync('bun', ['run', CLI, ...args], { cwd, encoding: 'utf8' })
  return { stdout: r.stdout, stderr: r.stderr, code: r.status ?? -1 }
}

function setupFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'al-cli-'))
  git(['init', '-b', 'main'], dir)
  git(['config', 'user.email', 't@example.com'], dir)
  git(['config', 'user.name', 'T'], dir)
  writeFileSync(join(dir, 'README.md'), '# agent-id\n\nDID for agents.\n')
  writeFileSync(
    join(dir, 'CHANGELOG.md'),
    `# Changelog\n\n## [0.2.0] - 2026-04-27\n\n### Added\n- batch verify\n`,
  )
  writeFileSync(
    join(dir, 'launch.yaml'),
    `version: 1
project:
  name: agent-id
  oneliner: "DID for agents"
  audience: "AI builders"
  hooks:
    - "Self-custody"
    - "Three functions"
platforms:
  - kind: hn
    pattern: show-hn
context:
  repo: p-vbordei/agent-id
`,
  )
  git(['add', '.'], dir)
  git(['commit', '-m', 'initial'], dir)
  return dir
}

describe('CLI', () => {
  test('context prints valid JSON for a fixture', () => {
    const dir = setupFixture()
    try {
      const { code, stdout } = runCli(['context', '0.2.0'], dir)
      expect(code).toBe(0)
      const ctx = JSON.parse(stdout)
      expect(ctx.version).toBe('0.2.0')
      expect(ctx.changelog).toContain('batch verify')
      expect(ctx.readme).toContain('DID for agents')
      expect(Array.isArray(ctx.commits)).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('exits 1 if launch.yaml missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'al-cli-'))
    try {
      const { code } = runCli(['context', '0.2.0'], dir)
      expect(code).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('exits 1 if version not in CHANGELOG', () => {
    const dir = setupFixture()
    try {
      const { code, stderr } = runCli(['context', '9.9.9'], dir)
      expect(code).toBe(1)
      expect(stderr).toMatch(/9\.9\.9/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('exits 64 on missing command', () => {
    const dir = setupFixture()
    try {
      const { code } = runCli([], dir)
      expect(code).toBe(64)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
