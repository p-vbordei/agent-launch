import { test, expect } from 'bun:test'
import { draftOne, type DraftDeps } from '../src/draft'
import type { Project, Platform } from '../src/config'
import type { GatheredContext } from '../src/context'

const project: Project = {
  name: 'agent-id',
  oneliner: 'DID for agents',
  audience: 'devs',
  hooks: ['Self-custody', 'Three functions'],
}
const ctx: GatheredContext & { repo: string } = {
  version: '0.2.0',
  changelog: 'thing',
  readme: 'x',
  commits: ['c'],
  repo: 'p-vbordei/agent-id',
}

function fakeAnthropic(out: string): DraftDeps['anthropic'] {
  return {
    messages: {
      create: async () => ({ content: [{ type: 'text', text: out }], stop_reason: 'end_turn' }),
    },
  }
}

const REPO_URL = 'https://github.com/p-vbordei/agent-id'

test('C3 — mastodon draft contains the github repo URL', async () => {
  const platform: Platform = { kind: 'mastodon', instance: 'h', handle: 'v' }
  const r = await draftOne({
    platform,
    project,
    context: ctx,
    deps: { anthropic: fakeAnthropic(`look ${REPO_URL}`) },
  })
  expect(r.body).toContain(REPO_URL)
})

test('C3 — hn draft contains the github repo URL in body', async () => {
  const platform: Platform = { kind: 'hn', pattern: 'show-hn' }
  const r = await draftOne({
    platform,
    project,
    context: ctx,
    deps: {
      anthropic: fakeAnthropic(JSON.stringify({ title: 'Show HN', body: REPO_URL })),
    },
  })
  expect(r.body).toContain(REPO_URL)
})

test('C3 — x thread last tweet contains the github repo URL', async () => {
  const platform: Platform = { kind: 'x', handle: 'v' }
  const thread = `hook\n---tweet---\nbody\n---tweet---\n${REPO_URL}`
  const r = await draftOne({
    platform,
    project,
    context: ctx,
    deps: { anthropic: fakeAnthropic(thread) },
  })
  expect(r.body).toContain(REPO_URL)
})
