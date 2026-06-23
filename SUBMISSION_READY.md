# Submission readiness — v1.2.2

**Repo:** https://github.com/augmentableai/tpsreport-obsidian-sync  
**Plugin ID:** `tpsreport-sync`  
**Version:** `1.2.2` (must match GitHub release tag exactly — no `v` prefix)

## What changed in 1.2.2

- Synced `main.js` with latest monorepo build: **Gatekeeper** health check, push-time metadata validation, report **settings** API client (`GET/PATCH /settings`, reindex), improved push modal flow
- No manifest ID or minAppVersion change

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

1. **Push** this commit to `origin/main`
2. **Create GitHub release** tag `1.2.2` with binary assets attached:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. **Obsidian PR** (if first-time or entry rejected): fork [obsidian-releases](https://github.com/obsidianmd/obsidian-releases), add to `community-plugins.json`:

```json
{
  "id": "tpsreport-sync",
  "name": "TPSReport",
  "author": "Augmentable LLC",
  "description": "Sync notes, research folders, and images with TPSReport AI Brain & Knowledge Management. Requires a TPSReport account.",
  "repo": "augmentableai/tpsreport-obsidian-sync"
}
```

4. PR checklist (paste in description):

```markdown
- [x] I have read the submission guidelines
- [x] My repo contains README.md, LICENSE, manifest.json, main.js
- [x] I have created a release tagged 1.2.2 with the required assets
- [x] My plugin ID is unique and does not contain "obsidian"
```

5. **Verify live:** https://tpsreport.pro/privacy and https://tpsreport.pro/terms load publicly

## Optional: BRAT beta install

While waiting for directory approval: install **BRAT** → Add beta plugin → `https://github.com/augmentableai/tpsreport-obsidian-sync`

## After approval (updates only)

Bump `manifest.json` → push → new release tag matching version. **No** new obsidian-releases PR needed.

*Updated: 2026-06-23*
