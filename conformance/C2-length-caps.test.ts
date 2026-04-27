import { test, expect } from 'bun:test'
import { draftOne, type DraftDeps } from '../src/draft'
import { loadPlatformTemplate } from '../src/platforms'
import type { Project, Platform } from '../src/config'
import type { GatheredContext } from '../src/context'

const project: Project = {
  name: 'agent-id',
  oneliner: 'DID',
  audience: 'devs',
  hooks: ['a', 'b'],
}
const ctx: GatheredContext & { repo: string } = {
  version: '0.2.0',
  changelog: 'thing',
  readme: 'x',
  commits: ['c'],
  repo: 'p-vbordei/agent-id',
}

function fakeAnthropic(out: string[]): DraftDeps['anthropic'] {
  let i = 0
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'text', text: out[i++] ?? out[out.length - 1] ?? '' }],
        stop_reason: 'end_turn',
      }),
    },
  }
}

test('C2 — within-cap on first try, capped:true', async () => {
  const platform: Platform = { kind: 'mastodon', instance: 'h', handle: 'v' }
  const tpl = loadPlatformTemplate('mastodon')
  const r = await draftOne({
    platform,
    project,
    context: ctx,
    deps: { anthropic: fakeAnthropic(['short toot']) },
  })
  expect(r.body.length).toBeLessThanOrEqual(tpl.length_cap)
  expect(r.capped).toBe(true)
  expect(r.retries).toBe(0)
})

test('C2 — over-cap once → retry → within cap, capped:true', async () => {
  const platform: Platform = { kind: 'mastodon', instance: 'h', handle: 'v' }
  const r = await draftOne({
    platform,
    project,
    context: ctx,
    deps: { anthropic: fakeAnthropic(['x'.repeat(700), 'short']) },
  })
  expect(r.capped).toBe(true)
  expect(r.retries).toBe(1)
})

test('C2 — over-cap forever → returns last with capped:false after 2 retries', async () => {
  const platform: Platform = { kind: 'mastodon', instance: 'h', handle: 'v' }
  const r = await draftOne({
    platform,
    project,
    context: ctx,
    deps: { anthropic: fakeAnthropic(['x'.repeat(700)]) },
  })
  expect(r.capped).toBe(false)
  expect(r.retries).toBe(2)
})

test('C2 — X tweet cap applies per tweet, not total', async () => {
  const platform: Platform = { kind: 'x', handle: 'v' }
  // 3 tweets each ≤ 280
  const ok = ['tweet one', 'tweet two has more', 'https://github.com/p-vbordei/agent-id'].join(
    '\n---tweet---\n',
  )
  const r = await draftOne({
    platform,
    project,
    context: ctx,
    deps: { anthropic: fakeAnthropic([ok]) },
  })
  expect(r.capped).toBe(true)
  expect(r.tweet_count).toBe(3)
})
