# Submission readiness — v1.2.2

**Repo:** https://github.com/augmentableai/tpsreport-obsidian-sync  
**Plugin ID:** `tpsreport-sync`  
**Version:** `1.2.2` (must match GitHub release tag exactly — no `v` prefix)  
**Official Obsidian listing (live):** https://community.obsidian.md/plugins/tpsreport-sync

## What changed in 1.2.2

- Synced `main.js` with latest monorepo build: **Gatekeeper** health check, push-time metadata validation, report **settings** API client (`GET/PATCH /settings`, reindex), improved push modal flow
- No manifest ID or minAppVersion change

## Skills (separate repo)

Agent skills live in **[augmentableai/skills](https://github.com/augmentableai/skills)**:

| Path | Purpose |
|------|---------|
| `skills/tpsreport-knowledge-base-generation/` | TPSReport KB generation skill + `kb_lint.py` + metadata contract |

Plugin repo **`skills/`** folder = install guides, examples, workflow docs (not the canonical skill copy).

Install:

```bash
npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y
```

Index via [skills.sh](https://skills.sh/docs) install telemetry.

## Required repo root files

| File | Status |
|------|--------|
| `main.js` | Yes |
| `manifest.json` | Yes — `1.2.2` |
| `styles.css` | Yes |
| `README.md` | Yes — use **full GitHub URLs** for doc links (Obsidian community page) |
| `LICENSE` | Yes (MIT) |
| `versions.json` | Yes |

## Before you resubmit to Obsidian

**Status:** Plugin is **approved and live** at https://community.obsidian.md/plugins/tpsreport-sync

Optional follow-ups:

1. **Update listing blurb** — push README with fixed absolute links so About / Use cases / FAQ / Skills hub work on community page
2. **New plugin version** — bump `manifest.json` → push → GitHub release tag matching version (no new directory PR for routine updates)

## Optional: BRAT beta install

Install **BRAT** → Add beta plugin → `https://github.com/augmentableai/tpsreport-obsidian-sync`

## After approval (updates only)

Bump `manifest.json` → push → new release tag matching version. **No** new obsidian-releases PR needed.

*Updated: 2026-06-22*
