import { test, expect } from 'bun:test'
import { draftOne, type DraftDeps } from '../src/draft'
import type { Project, Platform } from '../src/config'
import type { GatheredContext } from '../src/context'

const project: Project = {
  name: 'agent-id',
  oneliner: 'Machine-first identity for AI agents',
  audience: 'AI builders',
  hooks: ['Self-custody DID', 'Three functions'],
}
const ctx: GatheredContext & { repo: string } = {
  version: '0.2.0',
  changelog: '### Added\n- thing',
  readme: '# x',
  commits: ['abc'],
  repo: 'p-vbordei/agent-id',
}

const SCRIPTED = 'Show HN: agent-id\n\nhttps://github.com/p-vbordei/agent-id'

function makeAnthropic(): DraftDeps['anthropic'] {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'text', text: SCRIPTED }],
        stop_reason: 'end_turn',
      }),
    },
  }
}

test('C1 — same inputs + same model output → byte-identical drafts', async () => {
  const platform: Platform = { kind: 'mastodon', instance: 'hachyderm.io', handle: 'v' }
  const a = await draftOne({ platform, project, context: ctx, deps: { anthropic: makeAnthropic() } })
  const b = await draftOne({ platform, project, context: ctx, deps: { anthropic: makeAnthropic() } })
  expect(a.body).toBe(b.body)
  expect(a.length).toBe(b.length)
  expect(a.capped).toBe(b.capped)
})
