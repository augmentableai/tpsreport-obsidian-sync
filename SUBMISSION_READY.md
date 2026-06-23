# Submission readiness — v1.2.3

**Repo:** https://github.com/augmentableai/tpsreport-obsidian-sync  
**Plugin ID:** `tpsreport-sync`  
**Version:** `1.2.3` (must match GitHub release tag exactly — no `v` prefix)  
**Official Obsidian listing (live):** https://community.obsidian.md/plugins/tpsreport-sync

## What changed in 1.2.3

- README/docs only: fixed community listing links (full GitHub URLs), pointed skills to `augmentableai/skills`
- No `main.js` or behavior changes

## What changed in 1.2.2

- Synced `main.js` with latest monorepo build: **Gatekeeper** health check, push-time metadata validation, report **settings** API client (`GET/PATCH /settings`, reindex), improved push modal flow

## Skills (separate repo)

Agent skills live in **[augmentableai/skills](https://github.com/augmentableai/skills)**:

```bash
npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y
```

## Required repo root files

| File | Status |
|------|--------|
| `main.js` | Yes |
| `manifest.json` | Yes — `1.2.3` |
| `styles.css` | Yes |
| `README.md` | Yes |
| `LICENSE` | Yes (MIT) |
| `versions.json` | Yes |

## Release checklist

1. Tag **`1.2.3`** on GitHub with `main.js`, `manifest.json`, `styles.css`
2. Run Obsidian check-release for `1.2.3`
3. Community listing picks up updated README after scan

*Updated: 2026-06-22*
