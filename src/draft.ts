import type { Platform, Project } from './config'
import type { GatheredContext } from './context'
import { loadPlatformTemplate } from './platforms'

export interface DraftDeps {
  anthropic: { messages: { create: (params: unknown) => Promise<unknown> } }
}

export interface DraftResult {
  platform: Platform['kind']
  title?: string
  body: string
  length: number
  length_cap: number
  capped: boolean
  retries: number
  tweet_count?: number
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>
}

const MAX_RETRIES = 2
const MODEL = 'claude-opus-4-7'

export async function draftOne(args: {
  platform: Platform
  project: Project
  context: GatheredContext & { repo: string }
  deps: DraftDeps
}): Promise<DraftResult> {
  const tpl = loadPlatformTemplate(args.platform.kind)
  const userPrompt = renderUserPrompt(tpl.user_template, {
    project: args.project,
    platform: args.platform,
    context: args.context,
    version: args.context.version,
  })
  const systemPrompt = `${tpl.system}\n\n## Anti-examples\n${tpl.anti_examples}`

  let lastResult: { title?: string; body: string; tweet_count?: number } | undefined
  let retries = 0

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const finalUserPrompt =
      attempt === 0
        ? userPrompt
        : `${userPrompt}\n\nThe previous attempt exceeded the length limit. Rewrite shorter; ${tpl.length_cap_field === 'per_tweet' ? `each tweet must be ≤ ${tpl.length_cap} chars` : `the body must be ≤ ${tpl.length_cap} chars`}.${tpl.title_cap !== undefined ? ` Title ≤ ${tpl.title_cap} chars.` : ''}`

    const resp = (await args.deps.anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: finalUserPrompt }],
    })) as AnthropicResponse

    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim()

    const parsed = parseOutput(tpl.output_format, text)
    lastResult = parsed
    retries = attempt

    const lengthOk = checkLength(parsed, tpl)
    if (lengthOk) {
      return {
        platform: args.platform.kind,
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        body: parsed.body,
        length: parsed.body.length,
        length_cap: tpl.length_cap,
        capped: true,
        retries,
        ...(parsed.tweet_count !== undefined ? { tweet_count: parsed.tweet_count } : {}),
      }
    }
  }

  if (!lastResult) {
    throw new Error('no draft produced')
  }
  return {
    platform: args.platform.kind,
    ...(lastResult.title !== undefined ? { title: lastResult.title } : {}),
    body: lastResult.body,
    length: lastResult.body.length,
    length_cap: tpl.length_cap,
    capped: false,
    retries,
    ...(lastResult.tweet_count !== undefined ? { tweet_count: lastResult.tweet_count } : {}),
  }
}

function parseOutput(
  format: 'json' | 'thread' | 'text',
  text: string,
): { title?: string; body: string; tweet_count?: number } {
  if (format === 'json') {
    try {
      const obj = JSON.parse(text)
      return { title: String(obj.title ?? ''), body: String(obj.body ?? '') }
    } catch {
      // Fallback: treat whole output as body, no title
      return { body: text }
    }
  }
  if (format === 'thread') {
    const tweets = text
      .split('---tweet---')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    return { body: tweets.join('\n---tweet---\n'), tweet_count: tweets.length }
  }
  return { body: text }
}

function checkLength(
  parsed: { title?: string; body: string; tweet_count?: number },
  tpl: ReturnType<typeof loadPlatformTemplate>,
): boolean {
  if (tpl.title_cap !== undefined && parsed.title !== undefined) {
    if (parsed.title.length > tpl.title_cap) return false
  }
  if (tpl.length_cap_field === 'per_tweet') {
    const tweets = parsed.body.split('---tweet---').map((s) => s.trim())
    return tweets.every((t) => t.length <= tpl.length_cap)
  }
  return parsed.body.length <= tpl.length_cap
}

function renderUserPrompt(
  template: string,
  vars: {
    project: Project
    platform: Platform
    context: GatheredContext & { repo: string }
    version: string
  },
): string {
  const flat: Record<string, string> = {
    'project.name': vars.project.name,
    'project.oneliner': vars.project.oneliner,
    'project.audience': vars.project.audience,
    'project.hooks': vars.project.hooks.map((h) => `- ${h}`).join('\n'),
    'context.changelog': vars.context.changelog,
    'context.readme': vars.context.readme,
    'context.commits': vars.context.commits.join('\n'),
    'context.repo': vars.context.repo,
    version: vars.version,
  }
  if (vars.platform.kind === 'reddit') {
    flat['platform.subreddit'] = vars.platform.subreddit
  }
  let out = template
  for (const [k, v] of Object.entries(flat)) out = out.replaceAll(`{{${k}}}`, v)
  return out
}
