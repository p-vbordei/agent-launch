import { test, expect } from 'bun:test'
import { draftOne, type DraftDeps } from '../../src/draft'
import type { Project, Platform } from '../../src/config'
import type { GatheredContext } from '../../src/context'

const project: Project = {
  name: 'x',
  oneliner: 'y',
  audience: 'a',
  hooks: ['h'],
}
const ctx: GatheredContext & { repo: string } = {
  version: '0.2.0',
  changelog: 'c',
  readme: 'r',
  commits: ['c'],
  repo: 'o/r',
}

test('S4 — draftOne never invokes fetch (no posts to social platforms in v0.1)', async () => {
  const realFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = (() => {
    fetchCalled = true
    throw new Error('S4 violation: draft attempted fetch')
  }) as unknown as typeof fetch
  try {
    const fake: DraftDeps['anthropic'] = {
      messages: {
        create: async () => ({
          content: [{ type: 'text', text: 'short text' }],
          stop_reason: 'end_turn',
        }),
      },
    }
    await draftOne({
      platform: { kind: 'linkedin' },
      project,
      context: ctx,
      deps: { anthropic: fake },
    })
    expect(fetchCalled).toBe(false)
  } finally {
    globalThis.fetch = realFetch
  }
})
