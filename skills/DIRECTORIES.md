# Skill directories & backlinks

Where to list **TPSReport Obsidian plugin** and **KB Metadata Enrichment** skill for discovery and SEO.

**Repo:** https://github.com/augmentableai/tpsreport-obsidian-sync  
**Canonical skill repo (agentskill.sh / skills.sh):** https://github.com/augmentableai/kb-metadata-enrichment

Also bundled in plugin repo: `kb-metadata-enrichment/` folder.

### agentskill.sh — submit options

**Option A — dedicated skill repo (recommended for agentskill.sh):**
```
augmentableai/kb-metadata-enrichment
```

**Option B — plugin monorepo:**
```
augmentableai/tpsreport-obsidian-sync
```
**Official plugin listing:** https://community.obsidian.md/plugins/tpsreport-sync

---

## How skills.sh indexing works (important)

**There is no manual “submit” form and no `npx skills publish` command** in the current [vercel-labs/skills](https://github.com/vercel-labs/skills) CLI.

skills.sh is a **leaderboard driven by install telemetry**:

1. Host skill in a **public GitHub repo** with valid `SKILL.md` ✓
2. Users run **`npx skills add owner/repo`** — each install sends anonymous telemetry
3. After enough installs, the skill appears in [skills.sh](https://skills.sh) search & rankings

**Subfolder skills** (like ours) require `--full-depth`:

```bash
npx skills add augmentableai/kb-metadata-enrichment -y
```

**To seed your own listing:** run the install command yourself (and share the command in README). That counts as the first install event.

**Badge** (add to README after installs accumulate):

```markdown
[![skills.sh](https://skills.sh/b/augmentableai/tpsreport-obsidian-sync)](https://skills.sh/augmentableai/tpsreport-obsidian-sync)
```

For a **submit form with webhook sync**, use [agentskill.sh/submit](https://agentskill.sh/submit) instead.

---

## Submit now (high priority)

| Directory | Action | URL |
|-----------|--------|-----|
| **skills.sh** | Share install command; run once yourself to seed telemetry | [skills.sh](https://skills.sh) · [docs](https://skills.sh/docs) |
| **agentskill.sh** | Submit GitHub repo URL (has webhook sync) | [agentskill.sh/submit](https://agentskill.sh/submit) |
| **GitHub** | Topics on repo (already set): `obsidian-plugin`, `tpsreport`, `cursor-skill`, `knowledge-base`, `graph-rag`, `agent-skills` | [Repo settings](https://github.com/augmentableai/tpsreport-obsidian-sync) |
| **tpsreport.pro** | Link plugin listing + `skills/` path from product docs | [tpsreport.pro](https://tpsreport.pro) |
| **Obsidian forum** | Showcase post: plugin + KB skill workflow | [forum.obsidian.md](https://forum.obsidian.md) |

### Install commands (skills.sh)

```bash
# End users — skill lives in kb-metadata-enrichment/
npx skills add augmentableai/kb-metadata-enrichment -y

# Maintainer — seed your own skills.sh telemetry (run once after pushing)
npx skills add augmentableai/kb-metadata-enrichment -y
```

### agentskill.sh webhook (instant sync)

After claiming the repo on agentskill.sh:

- Webhook URL: `https://agentskill.sh/api/webhooks/github`
- Events: **push** only

---

## Credibility & long-tail

| Directory | Notes |
|-----------|-------|
| **anthropics/skills** | PR to official Anthropic skills repo — slow, high authority |
| **agentskills.io** | Follow [specification](https://agentskills.io/specification); SKILL.md already aligned |
| **Product Hunt** | Launch plugin + skills as one story |
| **AlternativeTo / SaaSHub** | List TPSReport under knowledge management |

---

## Passive / scraped (no submission)

These index public GitHub repos over time. Stars, installs, and README quality help ranking:

- **SkillsMP**
- **claudemarketplaces.com**
- **ClawHub** (OpenClaw ecosystem)

---

## Obsidian-specific

| Item | Status / action |
|------|-----------------|
| Community listing | **Live:** [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync) |
| Listing description | May still say "HiFi-WP" — update via PR to [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) |
| Version updates | New GitHub release only; no new directory PR for routine bumps |

---

## Link copy-paste (for your site / README)

**Plugin (official):**

```markdown
[Install TPSReport for Obsidian](https://community.obsidian.md/plugins/tpsreport-sync)
```

**Skill install:**

```markdown
npx skills add augmentableai/kb-metadata-enrichment -y
```

**Full resources hub:**

```markdown
[TPSReport skills & docs](https://github.com/augmentableai/tpsreport-obsidian-sync/tree/main/skills)
```

---

## Tracking

When listed on skills.sh or agentskill.sh, add the profile URL here:

| Directory | Listing URL |
|-----------|-------------|
| skills.sh | *(add after publish)* |
| agentskill.sh | *(add after import)* |
