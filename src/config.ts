import { readFileSync } from 'node:fs'
import { load } from 'js-yaml'
import { z } from 'zod'

export class LaunchConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LaunchConfigError'
  }
}

const HnSchema = z
  .object({
    kind: z.literal('hn'),
    pattern: z.enum(['show-hn', 'ask-hn', 'regular']),
  })
  .strict()

const RedditSchema = z
  .object({
    kind: z.literal('reddit'),
    subreddit: z.string().regex(/^[a-zA-Z0-9_]{2,21}$/, 'subreddit name must match /^[a-zA-Z0-9_]{2,21}$/ (no leading r/)'),
  })
  .strict()

const XSchema = z
  .object({
    kind: z.literal('x'),
    handle: z.string().min(1),
  })
  .strict()

const MastodonSchema = z
  .object({
    kind: z.literal('mastodon'),
    instance: z.string().min(1),
    handle: z.string().min(1),
  })
  .strict()

const LinkedinSchema = z
  .object({
    kind: z.literal('linkedin'),
  })
  .strict()

const PlatformSchema = z.discriminatedUnion('kind', [
  HnSchema,
  RedditSchema,
  XSchema,
  MastodonSchema,
  LinkedinSchema,
])

const ProjectSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    oneliner: z.string().min(1).max(120),
    audience: z.string().min(1).max(200),
    hooks: z.array(z.string().min(1)).min(1).max(5),
  })
  .strict()

const ContextSchema = z
  .object({
    repo: z.string().regex(/^[^/]+\/[^/]+$/, 'repo must be "owner/name"'),
    manifest: z.string().optional(),
  })
  .strict()

const LaunchConfigSchema = z
  .object({
    version: z.literal(1),
    project: ProjectSchema,
    platforms: z.array(PlatformSchema).min(1),
    context: ContextSchema,
  })
  .strict()

export type LaunchConfig = z.infer<typeof LaunchConfigSchema>
export type Platform = z.infer<typeof PlatformSchema>
export type Project = z.infer<typeof ProjectSchema>

export function loadLaunchConfig(path: string): LaunchConfig {
  let raw: unknown
  try {
    raw = load(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new LaunchConfigError(`failed to read or parse ${path}: ${(err as Error).message}`)
  }
  const result = LaunchConfigSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ')
    throw new LaunchConfigError(`invalid launch.yaml: ${issues}`)
  }
  return result.data
}
