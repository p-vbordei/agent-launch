import { test, expect } from 'bun:test'
import { draftOne, type DraftDeps } from '../src/draft'
import type { Project, Platform } from '../src/config'
import type { GatheredContext } from '../src/context'

const project: Project = {
  name: 'agent-id',
  oneliner: 'DID for agents',
  audience: 'devs',
  hooks: ['Self-custody'],
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

test('C4 — even with secrets in env, draft body never echoes them', async () => {
  process.env['ANTHROPIC_API_KEY'] = 'sk-ant-FAKE_TEST_TOKEN'
  process.env['GH_TOKEN'] = 'ghp_FAKE_TEST_TOKEN'
  process.env['NPM_TOKEN'] = 'npm_FAKE_TEST_TOKEN'
  try {
    const platform: Platform = { kind: 'linkedin' }
    const r = await draftOne({
      platform,
      project,
      context: ctx,
      deps: { anthropic: fakeAnthropic('a clean post about agent-id') },
    })
    expect(r.body).not.toContain('sk-ant-')
    expect(r.body).not.toContain('ghp_')
    expect(r.body).not.toContain('npm_')
  } finally {
    delete process.env['ANTHROPIC_API_KEY']
    delete process.env['GH_TOKEN']
    delete process.env['NPM_TOKEN']
  }
})

test('C4 — DraftResult contains only declared fields', async () => {
  const platform: Platform = { kind: 'mastodon', instance: 'h', handle: 'v' }
  const r = await draftOne({
    platform,
    project,
    context: ctx,
    deps: { anthropic: fakeAnthropic('short') },
  })
  const allowed = new Set([
    'platform',
    'title',
    'body',
    'length',
    'length_cap',
    'capped',
    'retries',
    'tweet_count',
  ])
  for (const k of Object.keys(r)) expect(allowed.has(k)).toBe(true)
})
