import { describe, expect, test } from 'bun:test'
import { loadPlatformTemplate, listPlatforms } from '../src/platforms'

describe('platform templates', () => {
  test('loads hn template with frontmatter + sections', () => {
    const t = loadPlatformTemplate('hn')
    expect(t.platform).toBe('hn')
    expect(t.length_cap).toBe(2000)
    expect(t.title_cap).toBe(80)
    expect(t.output_format).toBe('json')
    expect(t.system).toContain('Show HN')
    expect(t.user_template).toContain('{{project.name}}')
    expect(t.anti_examples).toContain('revolutionary')
  })

  test('loads x template with thread metadata', () => {
    const t = loadPlatformTemplate('x')
    expect(t.platform).toBe('x')
    expect(t.length_cap).toBe(280)
    expect(t.output_format).toBe('thread')
    expect(t.min_tweets).toBe(3)
    expect(t.max_tweets).toBe(5)
  })

  test('lists 5 platforms', () => {
    const list = listPlatforms()
    expect(list).toEqual(expect.arrayContaining(['hn', 'reddit', 'x', 'mastodon', 'linkedin']))
    expect(list).toHaveLength(5)
  })

  test('all 5 templates load without throwing', () => {
    for (const p of ['hn', 'reddit', 'x', 'mastodon', 'linkedin'] as const) {
      const t = loadPlatformTemplate(p)
      expect(t.system.length).toBeGreaterThan(50)
      expect(t.user_template.length).toBeGreaterThan(50)
      expect(t.anti_examples.length).toBeGreaterThan(50)
    }
  })

  test('throws on unknown platform', () => {
    expect(() => loadPlatformTemplate('alien' as 'hn')).toThrow()
  })
})
