import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CLI = resolve(import.meta.dir, '..', '..', 'src', 'index.ts')

function git(args: string[], cwd: string) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if ((r.status ?? -1) !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
}

function setupFixture() {
  const dir = mkdtempSync(join(tmpdir(), 's5-'))
  git(['init', '-b', 'main'], dir)
  git(['config', 'user.email', 't@example.com'], dir)
  git(['config', 'user.name', 'T'], dir)
  writeFileSync(join(dir, 'README.md'), '# x\n')
  writeFileSync(join(dir, 'CHANGELOG.md'), `## [0.2.0]\n\n### Added\n- thing\n`)
  writeFileSync(
    join(dir, 'launch.yaml'),
    `version: 1
project:
  name: x
  oneliner: y
  audience: a
  hooks: ["a"]
platforms:
  - kind: linkedin
context:
  repo: o/r
`,
  )
  git(['add', '.'], dir)
  git(['commit', '-m', 'i'], dir)
  return dir
}

function runCli(args: string[], cwd: string) {
  const r = spawnSync('bun', ['run', CLI, ...args], {
    cwd,
    env: { ...process.env, ANTHROPIC_API_KEY: '' },
    encoding: 'utf8',
  })
  return { stdout: r.stdout, stderr: r.stderr, code: r.status ?? -1 }
}

describe('S5 — output sandboxing', () => {
  test('rejects --out with absolute path outside cwd', () => {
    const dir = setupFixture()
    try {
      const { code, stderr } = runCli(['draft', '0.2.0', '--out', '/tmp/escape'], dir)
      expect(code).toBe(1)
      expect(stderr).toMatch(/inside/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('rejects --out with .. traversal', () => {
    const dir = setupFixture()
    try {
      const { code, stderr } = runCli(['draft', '0.2.0', '--out', '../escape'], dir)
      expect(code).toBe(1)
      expect(stderr).toMatch(/inside/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
