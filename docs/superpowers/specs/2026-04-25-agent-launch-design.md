# agent-launch — design v0.1

**Date:** 2026-04-25
**Status:** DRAFT — awaiting Stage 1 approval

## Problem

When a new OSS version ships, a solo maintainer needs to announce it on multiple platforms with platform-native tone: HN's "Show HN" pattern, Reddit's subreddit-specific etiquette, X's threaded format, Mastodon's longer-form, LinkedIn's business voice. Writing 5 versions of "we shipped v0.2.0" by hand on release day is exactly the toil this project is trying to eliminate.

Existing tooling (LaunchPilot, Buffer, etc.) handles cross-posting but produces generic copy and assumes the user wrote it. **No tool reads a repo's CHANGELOG + README + recent commits and produces 5 platform-native drafts.** And HN explicitly forbids automated submissions, so any "post-and-engage" automation is non-starter for the most important launch surface.

## What agent-launch IS (v0.1)

A single Bun-compiled binary that reads `launch.yaml` + the latest release context (CHANGELOG, README, recent commits, optionally an `agent-publish` release manifest) and **drafts** platform-native announcement posts. Drafts go to `launches/v<version>/<platform>.md`. The user reviews, copy-pastes, posts manually.

**v0.1 is draft-only.** No API posting. No reply monitoring. No engagement automation. This is honest about HN's "no automation" rule and ships value (well-crafted drafts informed by repo context) without account-binding complexity.

## What agent-launch is NOT (in v0.1)

- Not an auto-poster. **The user posts.** Posting on user approval is v0.2.
- Not a reply monitor. v0.3.
- Not a reply assistant. v0.3.
- Not a launch scheduler. The user picks the time.
- Not an analytics tool.
- Not a community manager.
- Not a cross-platform identity manager. Platform handles live in `launch.yaml`.

## Architecture (KISS)

Single Bun binary. ~5 source files. ≤200 lines each.

```
agent-launch/
├── README.md
├── SPEC.md
├── SCOPE.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── bunfig.toml / biome.json / tsconfig.json
├── src/
│   ├── index.ts                # CLI entry, dispatch
│   ├── config.ts               # launch.yaml load + Zod validation
│   ├── context.ts              # gather: CHANGELOG section, README, recent commits, optional manifest
│   ├── draft.ts                # call Claude with platform-specific system prompts
│   └── platforms/
│       ├── hn.ts               # platform-specific prompt + length rules
│       ├── reddit.ts
│       ├── x.ts
│       ├── mastodon.ts
│       └── linkedin.ts
├── prompts/                    # vendored platform-native prompt templates
│   ├── hn.md
│   ├── reddit.md
│   ├── x.md
│   ├── mastodon.md
│   └── linkedin.md
├── tests/
├── conformance/
├── examples/demo.ts            # 20-line: drafts agent-id v0.1.0 launch on all platforms
└── .github/workflows/ci.yml
```

Total runtime LoC target: < 600 for v0.1.

## `launch.yaml` schema (v0.1)

```yaml
version: 1
project:
  name: agent-id
  oneliner: "Machine-first identity for AI agents"
  audience: "AI infra builders, OSS contributors"
  hooks:
    - "Self-custody DID + Capability VC"
    - "Three functions, five dependencies, zero blockchain"
platforms:
  - kind: hn
    pattern: show-hn         # one of: show-hn, ask-hn, regular
  - kind: reddit
    subreddit: programming
  - kind: reddit
    subreddit: typescript
  - kind: x
    handle: vbordei          # informational; v0.1 doesn't post
  - kind: mastodon
    instance: hachyderm.io
    handle: vbordei
  - kind: linkedin
context:
  repo: p-vbordei/agent-id   # used to fetch recent commits, README, CHANGELOG
  manifest: ../release-manifest.json  # optional; if present, used for accurate version + URLs
```

Validated with Zod, strict mode (no unknown keys).

## CLI surface (v0.1)

```
agent-launch draft <version> [--platforms hn,reddit,x] [--out <dir>]
agent-launch context           # print the gathered context blob (for debugging)
```

Two commands. Anything else (post, monitor, reply) is DEFERRED.

## Draft flow (v0.1)

When `agent-launch draft <version>` runs:

1. **Load** `launch.yaml`. Validate.
2. **Gather context:**
   - CHANGELOG section for `<version>` (parsed from `## [<version>]` heading)
   - README (project overview)
   - Last 50 commits since previous tag (`gh api ... /commits` or local `git log`)
   - Release manifest if `context.manifest` is set (URLs, sha)
3. **For each configured platform:**
   - Load the vendored prompt template from `prompts/<platform>.md`
   - Render with project + context fields
   - Call Claude (`claude-opus-4-7`) with the platform's system prompt + the rendered context
   - Capture the draft text
4. **Write** drafts to `launches/v<version>/<platform>.md` (e.g., `launches/v0.2.0/hn.md`).
5. **Print summary:** "Drafted N posts for v<version> in launches/v<version>/" + bullet of platform → file path.

## Platform draft constraints (v0.1)

| Platform | Format | Length cap | Voice |
|---|---|---|---|
| HN (Show HN) | title + body | title ≤ 80 chars, body ≤ 2000 chars | Direct, no hype, technical, links to repo |
| Reddit | title + body | per-subreddit (default body ≤ 5000 chars) | Subreddit-aware (programming = technical, typescript = ecosystem-fit) |
| X | thread of 3-5 tweets | each ≤ 280 chars | Hooky first tweet, technical body, link last |
| Mastodon | single toot | ≤ 500 chars (default instance limit, configurable) | Indie / OSS / federated voice |
| LinkedIn | post | ≤ 3000 chars | Slightly more business voice, but still technical |

Each platform's prompt template lives in `prompts/<platform>.md` and is vendored at agent-launch HEAD. Updates flow with agent-launch releases.

## Trust & secrets

- v0.1 uses `ANTHROPIC_API_KEY` only. Reads `gh` for context if available (no token required for public repos; uses `GH_TOKEN` if set for private).
- No social-platform tokens required in v0.1 — drafts are local files.
- Future (v0.2 posting): `X_OAUTH_*`, `MASTODON_ACCESS_TOKEN`, `LINKEDIN_OAUTH_*`. Reddit and HN have no API-posting path — Reddit allows API but we'll use draft + browser-open pattern; HN never auto-posts.

## Conformance preview (Stage 4 detail)

- C1: drafts are deterministic given (launch.yaml, context blob, prompt templates, model). Verified by running twice with the same inputs (and `temperature: 0`) and diffing — must produce byte-identical output. (Note: model determinism with temp 0 is best-effort; we accept ≤ 1% character diff as "deterministic enough" if needed, documented in SPEC.)
- C2: drafts respect each platform's length cap. Failing drafts are regenerated up to N=2 retries; on third failure, write the over-length draft anyway with a warning.
- C3: drafts contain no secrets, no PII beyond `launch.yaml` declared fields.
- C4: drafts contain at least one URL pointing to the project repo.
- C5: launch.yaml with missing/extra/invalid fields fails fast.

## Demo preview (Stage 5)

`examples/demo.ts` (≤ 20 lines): generates 5 drafts for `agent-id` v0.1.0 launch using a fixture `launch.yaml` and the agent-id README+CHANGELOG, prints the file paths.

## Decisions taken (no further user input needed)

| Decision | Choice | Rejected alternatives |
|---|---|---|
| v0.1 scope | Drafts only, no posting | Auto-post (HN forbids; ethics murky for others) |
| Platforms | HN, Reddit, X, Mastodon, LinkedIn | Tumblr, Bluesky (defer; small audience for OSS infra), email blast |
| Prompt templates | Vendored per-platform `.md` files | Single mega-prompt with platform args |
| Output | Markdown files in `launches/v<version>/` | Stdout, JSON, database |
| Context source | CHANGELOG + README + git log + optional manifest | Issues, PRs, discussions (noisier signal) |
| Model | `claude-opus-4-7`, temperature 0 | Other models, higher temperature |
| Retry on length cap | Up to 2 regenerates, then warn | Hard fail, infinite retry |

## Roadmap beyond v0.1

- v0.2: post-on-approval flow for X / Mastodon / LinkedIn (APIs). Reddit and HN: open browser with prefilled fields, user clicks Submit.
- v0.3: reply monitoring (poll X / Mastodon / Reddit / HN Algolia for 24h post-launch) + draft suggested replies for user approval.
- v0.4: launch timing recommendations (best time for each platform).
- v0.5: A/B variant generation (3 drafts per platform; user picks).

## Open questions

None blocking Stage 1.
