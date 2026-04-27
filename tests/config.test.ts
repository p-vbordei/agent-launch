import { describe, expect, test } from 'bun:test'
import { loadLaunchConfig, LaunchConfigError } from '../src/config'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function withTmp(content: string, fn: (path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'al-cfg-'))
  const path = join(dir, 'launch.yaml')
  writeFileSync(path, content)
  try {
    fn(path)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const VALID = `version: 1
project:
  name: agent-id
  oneliner: "Machine-first identity for AI agents"
  audience: "AI infra builders"
  hooks:
    - "Self-custody DID + Capability VC"
    - "Three functions, five deps, zero blockchain"
platforms:
  - kind: hn
    pattern: show-hn
  - kind: reddit
    subreddit: programming
  - kind: reddit
    subreddit: typescript
  - kind: x
    handle: vbordei
  - kind: mastodon
    instance: hachyderm.io
    handle: vbordei
  - kind: linkedin
context:
  repo: p-vbordei/agent-id
`

describe('loadLaunchConfig', () => {
  test('parses a valid 5-platform config', () => {
    withTmp(VALID, (p) => {
      const cfg = loadLaunchConfig(p)
      expect(cfg.version).toBe(1)
      expect(cfg.project.name).toBe('agent-id')
      expect(cfg.project.hooks).toHaveLength(2)
      expect(cfg.platforms).toHaveLength(6) // 2x reddit + hn + x + mastodon + linkedin
      expect(cfg.context.repo).toBe('p-vbordei/agent-id')
    })
  })

  test('allows multiple reddit platforms (different subreddits)', () => {
    withTmp(VALID, (p) => {
      const cfg = loadLaunchConfig(p)
      const reddits = cfg.platforms.filter((pl) => pl.kind === 'reddit')
      expect(reddits).toHaveLength(2)
    })
  })

  test('rejects invalid platform kind', () => {
    const yaml = VALID.replace('  - kind: hn\n    pattern: show-hn\n', '  - kind: alien\n')
    withTmp(yaml, (p) => expect(() => loadLaunchConfig(p)).toThrow())
  })

  test('rejects invalid hn pattern', () => {
    const yaml = VALID.replace('pattern: show-hn', 'pattern: spam')
    withTmp(yaml, (p) => expect(() => loadLaunchConfig(p)).toThrow(/pattern/))
  })

  test('rejects invalid subreddit format', () => {
    const yaml = VALID.replace('subreddit: programming', 'subreddit: r/has-slash')
    withTmp(yaml, (p) => expect(() => loadLaunchConfig(p)).toThrow(/subreddit/))
  })

  test('rejects extra unknown top-level key', () => {
    withTmp(`${VALID}extra: y\n`, (p) => expect(() => loadLaunchConfig(p)).toThrow())
  })

  test('rejects empty hooks array', () => {
    const yaml = VALID.replace(/  hooks:\n    - "[^"]*"\n    - "[^"]*"\n/, '  hooks: []\n')
    withTmp(yaml, (p) => expect(() => loadLaunchConfig(p)).toThrow(/hooks/))
  })

  test('rejects more than 5 hooks', () => {
    const six = '  hooks:\n    - "a"\n    - "b"\n    - "c"\n    - "d"\n    - "e"\n    - "f"\n'
    const yaml = VALID.replace(/  hooks:\n    - "[^"]*"\n    - "[^"]*"\n/, six)
    withTmp(yaml, (p) => expect(() => loadLaunchConfig(p)).toThrow(/hooks/))
  })

  test('rejects malformed repo', () => {
    const yaml = VALID.replace('repo: p-vbordei/agent-id', 'repo: norepo')
    withTmp(yaml, (p) => expect(() => loadLaunchConfig(p)).toThrow(/repo/))
  })

  test('rejects empty platforms', () => {
    const yaml = VALID.replace(/platforms:[\s\S]*?context:/, 'platforms: []\ncontext:')
    withTmp(yaml, (p) => expect(() => loadLaunchConfig(p)).toThrow(/platforms/))
  })

  test('manifest is optional', () => {
    withTmp(VALID, (p) => {
      const cfg = loadLaunchConfig(p)
      expect(cfg.context.manifest).toBeUndefined()
    })
    const withMan = `${VALID}  manifest: ./release-manifest.json\n`
    withTmp(withMan, (p) => {
      const cfg = loadLaunchConfig(p)
      expect(cfg.context.manifest).toBe('./release-manifest.json')
    })
  })
})
