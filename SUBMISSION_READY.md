# Submission readiness — v1.2.2

**Repo:** https://github.com/augmentableai/tpsreport-obsidian-sync  
**Plugin ID:** `tpsreport-sync`  
**Version:** `1.2.2` (must match GitHub release tag exactly — no `v` prefix)  
**Official Obsidian listing (live):** https://community.obsidian.md/plugins/tpsreport-sync

## What changed in 1.2.2

- Synced `main.js` with latest monorepo build: **Gatekeeper** health check, push-time metadata validation, report **settings** API client (`GET/PATCH /settings`, reindex), improved push modal flow
- No manifest ID or minAppVersion change

## Skills bundle (same repo)

Agent workflows live under **`skills/`**:

| Path | Purpose |
|------|---------|
| `skills/README.md` | Skills index |
| `skills/kb-metadata-enrichment/` | KB lifecycle skill + `kb_lint.py` + `metadata-contract.yaml` |

Install: `cp -r skills/kb-metadata-enrichment .cursor/skills/` or `npx skills add augmentableai/tpsreport-obsidian-sync/skills/kb-metadata-enrichment`

Submit for indexing: [agentskill.sh/submit](https://agentskill.sh/submit), [skills.sh](https://skills.sh/docs)

## Required repo root files

| File | Status |
|------|--------|
| `main.js` | Yes |
| `manifest.json` | Yes — `1.2.2` |
| `styles.css` | Yes |
| `README.md` | Yes |
| `LICENSE` | Yes (MIT) |
| `versions.json` | Yes |

## Before you resubmit to Obsidian

**Status:** Plugin is **approved and live** at https://community.obsidian.md/plugins/tpsreport-sync

Optional follow-ups:

1. **Update listing blurb** — community page may still show stale "HiFi-WP" text; open a PR to [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) `community-plugins.json` if description needs refresh
2. **New plugin version** — bump `manifest.json` → push → GitHub release tag matching version (no new directory PR for routine updates)

## Optional: BRAT beta install

While waiting for directory approval: install **BRAT** → Add beta plugin → `https://github.com/augmentableai/tpsreport-obsidian-sync`

## After approval (updates only)

Bump `manifest.json` → push → new release tag matching version. **No** new obsidian-releases PR needed.

*Updated: 2026-06-23*
