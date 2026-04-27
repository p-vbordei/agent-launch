# Changelog

All notable changes to agent-launch will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-27

### Added

- `agent-launch context <version>` — gather and print the launch context (CHANGELOG section, README, last 50 commits, optional `agent-publish` release manifest). No API call.
- `agent-launch draft <version> [--platforms <list>] [--out <dir>]` — generate platform-native drafts via Claude (`claude-opus-4-7`, temperature 0). Writes markdown drafts with YAML frontmatter to `launches/v<version>/`.
- 5 vendored prompt templates in `prompts/` — HN, Reddit, X, Mastodon, LinkedIn — each with system + user template + anti-examples (no AI marketing slop).
- `launch.yaml` strict Zod schema (1-5 hooks, multiple `kind: reddit` permitted, regex-validated subreddit names).
- Length-cap retry: regenerate up to 2 times if a draft exceeds platform cap; fall through with `capped: false` flag if still over.
- Output sandboxing (S5): `--out` rejects absolute paths outside cwd and `..` traversal.
- Conformance vectors C1–C5 (determinism, length caps, repo URL present, no secrets, strict YAML).
- Security tests S2 (no shell tool exposed to model), S4 (no network writes outside Anthropic), S5 (output sandbox).
- Self-contained demo in `examples/demo.ts` + `examples/demo-fixture/` — runs in <1s, no API key.
- GitHub Actions `ci.yml` — install + tsc + test + compile + smoke.
- 50 tests across unit, integration, conformance, security suites.

### Out of v0.1 (deferred)

- v0.2: post-on-approval to X / Mastodon / LinkedIn APIs; browser-open with prefilled fields for Reddit / HN.
- v0.3: reply monitoring + suggested-reply drafting.
