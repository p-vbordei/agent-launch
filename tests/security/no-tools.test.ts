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

test('S2 — Anthropic SDK call has NO tools field (model has no shell/bash access in v0.1)', async () => {
  let lastParams: Record<string, unknown> | undefined
  const fakeAnthropic: DraftDeps['anthropic'] = {
    messages: {
      create: async (params: unknown) => {
        lastParams = params as Record<string, unknown>
        return {
          content: [{ type: 'text', text: 'short text' }],
          stop_reason: 'end_turn',
        }
      },
    },
  }
  await draftOne({
    platform: { kind: 'mastodon', instance: 'h', handle: 'v' },
    project,
    context: ctx,
    deps: { anthropic: fakeAnthropic },
  })
  expect(lastParams).toBeDefined()
  // Critical: no `tools` key in the SDK params object.
  expect(Object.keys(lastParams ?? {})).not.toContain('tools')
  // Sanity: model + system prompt + temperature are set.
  expect(lastParams?.['model']).toBe('claude-opus-4-7')
  expect(typeof lastParams?.['system']).toBe('string')
})
