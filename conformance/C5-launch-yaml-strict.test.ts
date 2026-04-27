import { test, expect, describe } from 'bun:test'
import { loadLaunchConfig, LaunchConfigError } from '../src/config'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function withTmp(yaml: string, fn: (path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'c5-'))
  const p = join(dir, 'launch.yaml')
  writeFileSync(p, yaml)
  try {
    fn(p)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('C5 — launch.yaml strict schema', () => {
  test('rejects missing version', () => {
    withTmp(
      `project:
  name: x
  oneliner: y
  audience: a
  hooks: ["a"]
platforms:
  - kind: linkedin
context:
  repo: o/r
`,
      (p) => expect(() => loadLaunchConfig(p)).toThrow(LaunchConfigError),
    )
  })

  test('rejects unknown top-level key', () => {
    withTmp(
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
extra: y
`,
      (p) => expect(() => loadLaunchConfig(p)).toThrow(),
    )
  })

  test('rejects unknown platform kind', () => {
    withTmp(
      `version: 1
project:
  name: x
  oneliner: y
  audience: a
  hooks: ["a"]
platforms:
  - kind: alien
context:
  repo: o/r
`,
      (p) => expect(() => loadLaunchConfig(p)).toThrow(),
    )
  })

  test('rejects too many hooks (>5)', () => {
    withTmp(
      `version: 1
project:
  name: x
  oneliner: y
  audience: a
  hooks: ["a","b","c","d","e","f"]
platforms:
  - kind: linkedin
context:
  repo: o/r
`,
      (p) => expect(() => loadLaunchConfig(p)).toThrow(/hooks/),
    )
  })

  test('rejects oneliner too long (>120 chars)', () => {
    const long = 'x'.repeat(150)
    withTmp(
      `version: 1
project:
  name: x
  oneliner: "${long}"
  audience: a
  hooks: ["a"]
platforms:
  - kind: linkedin
context:
  repo: o/r
`,
      (p) => expect(() => loadLaunchConfig(p)).toThrow(/oneliner/),
    )
  })
})
