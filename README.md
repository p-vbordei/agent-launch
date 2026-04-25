# agent-launch

> Draft platform-native release announcements (HN, Reddit, X, Mastodon, LinkedIn) from your repo's CHANGELOG + README + recent commits. Single Bun binary. **v0.1: drafts only — you post.**

**Status:** v0.0.0 — under construction. See [SCOPE.md](./SCOPE.md), [SPEC.md](./SPEC.md), [docs/superpowers/specs/](./docs/superpowers/specs/).

## What it does

```bash
bun install
$EDITOR launch.yaml
agent-launch draft v0.2.0
# →  launches/v0.2.0/hn.md, reddit-programming.md, reddit-typescript.md,
#    x.md, mastodon.md, linkedin.md
```

Each draft is platform-native: HN's "Show HN" pattern, Reddit's subreddit etiquette, X's threaded format, Mastodon's longer-form toot, LinkedIn's slightly-more-business voice. No "revolutionary" or "game-changing" marketing slop — anti-examples are baked into the prompts.

## Why drafts only in v0.1

- HN explicitly forbids automated submissions. Any auto-poster ships dead.
- Reddit's API allows posting but rate limits + subreddit moderation make automation fragile.
- The hard part is "well-written platform-native copy informed by the actual repo." That's what v0.1 ships.
- Posting on user approval is **v0.2**. Reply monitoring is **v0.3**.

## Roadmap

| Version | What ships |
|---|---|
| **v0.1 (current)** | Draft generation across 5 platforms. |
| v0.2 | Post-on-approval for X / Mastodon / LinkedIn (APIs). Browser-open with prefilled fields for Reddit / HN. |
| v0.3 | Reply monitoring + suggested-reply drafting. |
| v0.4 | Launch-time recommendations per platform. |

## What it is NOT

- Not an analytics tool.
- Not a community manager.
- Not a cross-platform identity manager.
- Not a multi-language translator.
- Not an OG-image / banner generator.

## Family

`agent-launch` is one of three sibling repos for autonomous OSS maintenance — see [`../multi-oss-launch-and-maintain/`](../multi-oss-launch-and-maintain/) for the coordination hub.

## License

Apache 2.0 — see [LICENSE](./LICENSE).
