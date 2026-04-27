import { describe, expect, test } from 'bun:test'
import { draftOne, type DraftDeps } from '../src/draft'
import type { Project, Platform } from '../src/config'
import type { GatheredContext } from '../src/context'

const project: Project = {
  name: 'agent-id',
  oneliner: 'Machine-first identity for AI agents',
  audience: 'AI builders',
  hooks: ['Self-custody DID', 'Three functions'],
}

const ctx: GatheredContext = {
  version: '0.2.0',
  changelog: '### Added\n- batch verify',
  readme: '# agent-id\n\nDID for agents.',
  commits: ['abc123 feat: batch verify'],
}

function fakeAnthropic(textPerCall: string[]): DraftDeps['anthropic'] {
  let i = 0
  return {
    messages: {
      create: async () => {
        const text = textPerCall[i] ?? textPerCall[textPerCall.length - 1] ?? ''
        i++
        return {
          content: [{ type: 'text', text }],
          stop_reason: 'end_turn',
        }
      },
    },
  }
}

describe('draftOne', () => {
  test('hn: parses JSON output, returns title + body', async () => {
    const platform: Platform = { kind: 'hn', pattern: 'show-hn' }
    const result = await draftOne({
      platform,
      project,
      context: { ...ctx, repo: 'p-vbordei/agent-id' },
      deps: {
        anthropic: fakeAnthropic([
          JSON.stringify({
            title: 'Show HN: agent-id – DID for agents',
            body: 'A short body. https://github.com/p-vbordei/agent-id',
          }),
        ]),
      },
    })
    expect(result.title).toBe('Show HN: agent-id – DID for agents')
    expect(result.body).toContain('https://github.com/p-vbordei/agent-id')
    expect(result.capped).toBe(true)
  })

  test('x: parses thread separated by ---tweet---', async () => {
    const platform: Platform = { kind: 'x', handle: 'vbordei' }
    const result = await draftOne({
      platform,
      project,
      context: { ...ctx, repo: 'p-vbordei/agent-id' },
      deps: {
        anthropic: fakeAnthropic([
          'Tweet 1 hook.\n---tweet---\nTweet 2 explains.\n---tweet---\nhttps://github.com/p-vbordei/agent-id',
        ]),
      },
    })
    expect(result.body).toContain('---tweet---')
    expect(result.tweet_count).toBe(3)
  })

  test('mastodon: returns text body', async () => {
    const platform: Platform = { kind: 'mastodon', instance: 'hachyderm.io', handle: 'vbordei' }
    const result = await draftOne({
      platform,
      project,
      context: { ...ctx, repo: 'p-vbordei/agent-id' },
      deps: {
        anthropic: fakeAnthropic(['Short toot. https://github.com/p-vbordei/agent-id']),
      },
    })
    expect(result.body).toContain('https://github.com/p-vbordei/agent-id')
    expect(result.title).toBeUndefined()
  })

  test('regenerates when over length cap (≤2 retries)', async () => {
    const platform: Platform = { kind: 'mastodon', instance: 'hachyderm.io', handle: 'vbordei' }
    const longBody = 'a'.repeat(700) // > 500 mastodon cap
    const shortBody = `short. https://github.com/p-vbordei/agent-id`
    const result = await draftOne({
      platform,
      project,
      context: { ...ctx, repo: 'p-vbordei/agent-id' },
      deps: { anthropic: fakeAnthropic([longBody, shortBody]) },
    })
    expect(result.capped).toBe(true)
    expect(result.body).toBe(shortBody)
    expect(result.retries).toBe(1)
  })

  test('returns over-length draft after 2 retries with capped:false', async () => {
    const platform: Platform = { kind: 'mastodon', instance: 'hachyderm.io', handle: 'vbordei' }
    const longBody = 'a'.repeat(700)
    const result = await draftOne({
      platform,
      project,
      context: { ...ctx, repo: 'p-vbordei/agent-id' },
      deps: { anthropic: fakeAnthropic([longBody, longBody, longBody]) },
    })
    expect(result.capped).toBe(false)
    expect(result.retries).toBe(2)
  })

  test('hn: enforces title cap separately', async () => {
    const platform: Platform = { kind: 'hn', pattern: 'show-hn' }
    const longTitle = 'Show HN: ' + 'x'.repeat(200)
    const goodOut = JSON.stringify({
      title: 'Show HN: agent-id – DID',
      body: 'short. https://github.com/p-vbordei/agent-id',
    })
    const result = await draftOne({
      platform,
      project,
      context: { ...ctx, repo: 'p-vbordei/agent-id' },
      deps: {
        anthropic: fakeAnthropic([
          JSON.stringify({ title: longTitle, body: 'short body' }),
          goodOut,
        ]),
      },
    })
    expect(result.capped).toBe(true)
    expect((result.title ?? '').length).toBeLessThanOrEqual(80)
  })
})
