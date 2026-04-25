# SCOPE — agent-launch v0.1

Output of Stage 1 (Scope compression). Default verdict for any feature is **DEFERRED**. Inclusion in v0.1 requires either (a) a real first-party caller TODAY, or (b) the primary use case dies without it.

## Primary use case

> **"On release day, I run `agent-launch draft v0.2.0` and within 30 seconds I have 5 platform-native drafts (HN, Reddit×2, X thread, Mastodon, LinkedIn) in `launches/v0.2.0/`. I read them, lightly edit, post them by hand. I do not write copy."**

If a v0.1 release of any agent-* repo cannot get to "5 reviewable drafts in 30 seconds" via this command, agent-launch has not shipped v0.1.

---

## Features evaluated

### F1 — `launch.yaml` config (Zod-validated, strict)
- First-party caller TODAY? **Yes — agent-id, agent-ask are ready to author one.**
- Primary use case dies without it? **Yes — `draft` has nothing to read.**
- **VERDICT: IN-V0.1**

### F2 — `draft <version>` command
- First-party caller TODAY? **Yes.**
- Primary use case dies without it? **Yes — this IS the use case.**
- **VERDICT: IN-V0.1**

### F3 — `context` command (debug aid: print gathered context blob)
- First-party caller TODAY? **Yes — the user when launch.yaml feels off.**
- Primary use case dies without it? **No, but cheap to ship; useful for testing.**
- **VERDICT: IN-V0.1**

### F4 — Context gathering: CHANGELOG section + README + recent commits + optional release manifest
- First-party caller TODAY? **Yes.**
- Primary use case dies without it? **Yes — drafts without repo context are generic and useless.**
- **VERDICT: IN-V0.1**

### F5 — HN draft generation (Show HN pattern, title + body, length-capped)
- First-party caller TODAY? **Yes — HN is the most important launch surface for OSS infra.**
- Primary use case dies without it? **Yes — losing HN loses the primary audience.**
- **VERDICT: IN-V0.1**

### F6 — Reddit draft generation (subreddit-aware)
- First-party caller TODAY? **Yes — r/programming, r/typescript both relevant.**
- Primary use case dies without it? **No, but expected platform.**
- **VERDICT: IN-V0.1**

### F7 — X thread draft generation (3-5 tweets, length-capped per tweet)
- First-party caller TODAY? **Yes.**
- Primary use case dies without it? **No, but expected platform.**
- **VERDICT: IN-V0.1**

### F8 — Mastodon toot draft (single, length-capped)
- First-party caller TODAY? **Yes — federated audience overlaps with OSS infra crowd.**
- **VERDICT: IN-V0.1**

### F9 — LinkedIn post draft
- First-party caller TODAY? **Yes — adjacent professional audience.**
- **VERDICT: IN-V0.1**

### F10 — Per-platform prompt templates (vendored markdown files)
- First-party caller TODAY? **Yes — every draft uses one.**
- Primary use case dies without it? **Yes — generic prompts produce generic copy; the whole value prop is platform-native voice.**
- **VERDICT: IN-V0.1**

### F11 — Length-cap retry loop (regenerate if a draft exceeds platform cap, max 2 retries)
- First-party caller TODAY? **Yes — Claude occasionally exceeds caps.**
- Primary use case dies without it? **No, but drafts that violate caps require manual cutdown — annoying.**
- **VERDICT: IN-V0.1**

### F12 — Conformance test vectors (C1–C5)
- First-party caller TODAY? **Yes — CI.**
- **VERDICT: IN-V0.1**

### F13 — 20-line demo (drafts agent-id v0.1.0 across all platforms)
- First-party caller TODAY? **Yes — the user when validating end-to-end.**
- **VERDICT: IN-V0.1**

---

### F14 — Auto-post drafts to platform APIs (X, Mastodon, LinkedIn) on user approval
- First-party caller TODAY? **None — user can copy-paste in v0.1.**
- Primary use case dies without it? **No.**
- **VERDICT: DEFERRED-V0.2**

### F15 — Reddit / HN browser-open pattern (open submit URL with prefilled fields)
- First-party caller TODAY? **None.**
- **VERDICT: DEFERRED-V0.2**

### F16 — Reply monitoring (poll platforms for replies on launch day)
- First-party caller TODAY? **None.**
- **VERDICT: DEFERRED-V0.3**

### F17 — Reply drafting (suggest responses to incoming replies for user approval)
- First-party caller TODAY? **None.**
- **VERDICT: DEFERRED-V0.3**

### F18 — Launch-time recommendations (best time for each platform)
- First-party caller TODAY? **None.**
- **VERDICT: DEFERRED-V0.4**

### F19 — A/B variant generation (3 drafts per platform; user picks)
- First-party caller TODAY? **None.**
- **VERDICT: DEFERRED-V0.5**

### F20 — Bluesky / Tumblr / Threads support
- First-party caller TODAY? **None.**
- **VERDICT: DEFERRED** (revisit when audience signals it)

---

### F21 — Personality / tone customization beyond per-platform default
- First-party caller TODAY? **None.**
- **VERDICT: CUT** (anti-pattern: configurability without consumer)

### F22 — Image / OG-card generation
- First-party caller TODAY? **None — text drafts are the v0.1 target.**
- **VERDICT: CUT**

### F23 — Multi-language drafts (translate launches to N languages)
- First-party caller TODAY? **None.**
- **VERDICT: CUT**

### F24 — Email newsletter integration
- First-party caller TODAY? **None.**
- **VERDICT: CUT**

### F25 — Analytics / engagement metrics
- First-party caller TODAY? **None.**
- **VERDICT: CUT** (use platform-native dashboards)

---

## Summary

**IN-V0.1 (13):** F1 launch.yaml · F2 draft command · F3 context command · F4 context gathering · F5 HN · F6 Reddit · F7 X · F8 Mastodon · F9 LinkedIn · F10 prompt templates · F11 length retry · F12 conformance · F13 demo

**DEFERRED:**
- v0.2: F14 auto-post · F15 browser-open
- v0.3: F16 reply monitor · F17 reply drafting
- v0.4: F18 timing recs
- v0.5: F19 A/B variants
- TBD: F20 more platforms

**CUT (5):** F21 personality config · F22 images · F23 translation · F24 email · F25 analytics

This v0.1 fits the project philosophy: ONE problem (well-crafted, platform-native release-day drafts), composed of mature primitives (Claude SDK + gh CLI), ~5-7 source files, single binary deliverable, < 600 LoC.

The decision to ship draft-only (no posting) in v0.1 is deliberate: it sidesteps HN's "no automation" rule, avoids account-binding complexity, and ships value (informed drafts) faster. Posting moves to v0.2 once the draft quality is validated in real launches.
