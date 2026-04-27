import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { load } from 'js-yaml'
import { z } from 'zod'

export type PlatformKind = 'hn' | 'reddit' | 'x' | 'mastodon' | 'linkedin'

const FrontmatterSchema = z.object({
  platform: z.enum(['hn', 'reddit', 'x', 'mastodon', 'linkedin']),
  length_cap: z.number().int().positive(),
  length_cap_field: z.enum(['body', 'per_tweet']),
  title_cap: z.number().int().positive().optional(),
  output_format: z.enum(['json', 'thread', 'text']),
  min_tweets: z.number().int().positive().optional(),
  max_tweets: z.number().int().positive().optional(),
})

export type PlatformTemplate = z.infer<typeof FrontmatterSchema> & {
  system: string
  user_template: string
  anti_examples: string
}

const PLATFORMS_DIR = resolve(import.meta.dir, '..', 'prompts')

export function listPlatforms(): PlatformKind[] {
  return ['hn', 'reddit', 'x', 'mastodon', 'linkedin']
}

export function loadPlatformTemplate(kind: PlatformKind): PlatformTemplate {
  const path = resolve(PLATFORMS_DIR, `${kind}.md`)
  if (!existsSync(path)) {
    throw new Error(`platform template not found: ${kind} (expected at ${path})`)
  }
  const raw = readFileSync(path, 'utf8')
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!fmMatch) {
    throw new Error(`invalid template (missing frontmatter): ${path}`)
  }
  const fmYaml = fmMatch[1]
  const body = fmMatch[2]
  if (fmYaml === undefined || body === undefined) {
    throw new Error(`invalid template structure: ${path}`)
  }
  const fm = FrontmatterSchema.parse(load(fmYaml))

  const system = extractSection(body, 'System')
  const user_template = extractSection(body, 'User')
  const anti_examples = extractSection(body, 'Anti-examples')

  return { ...fm, system, user_template, anti_examples }
}

function extractSection(body: string, heading: string): string {
  const re = new RegExp(`^## ${heading}\\n([\\s\\S]*?)(?=^## |$(?![\\r\\n]))`, 'm')
  const match = body.match(re)
  if (!match || match[1] === undefined) {
    throw new Error(`section "${heading}" not found in template`)
  }
  return match[1].trim()
}
