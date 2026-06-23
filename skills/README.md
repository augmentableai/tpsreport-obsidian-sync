# TPSReport skills — agent workflows for knowledge bases

This folder ships **Cursor / Claude Code / skills.sh-compatible** workflows that pair with the [TPSReport Obsidian plugin](../README.md).

| Skill | Purpose |
|-------|---------|
| **[kb-metadata-enrichment](kb-metadata-enrichment/)** | End-to-end KB lifecycle — seed, write, enrich RAG frontmatter, lint, push via plugin |

## Official plugin listing

Install the Obsidian plugin from the community directory:

**https://community.obsidian.md/plugins/tpsreport-sync**

## Quick install (Cursor project)

Copy into your vault repo:

```text
.cursor/skills/kb-metadata-enrichment/
├── SKILL.md
├── metadata-contract.yaml
└── kb_lint.py
```

Or symlink from this repo:

```bash
# from your vault project root
mkdir -p .cursor/skills
cp -r path/to/tpsreport-obsidian-sync/skills/kb-metadata-enrichment .cursor/skills/
```

## Quick install (skills.sh / npx)

```bash
npx skills add augmentableai/tpsreport-obsidian-sync/skills/kb-metadata-enrichment
```

(Exact CLI flags may vary — see [skills.sh/docs](https://skills.sh/docs).)

## What you need

| Piece | Role |
|-------|------|
| **[TPSReport Obsidian plugin](https://community.obsidian.md/plugins/tpsreport-sync)** | Publish, push, pull, Gatekeeper |
| **[TPSReport account](https://tpsreport.pro)** + `obs_…` API key | Cloud sync |
| **This skill folder** | Authoring + `kb_lint.py` |
| **Python 3 + PyYAML** | Local lint only (`pip install pyyaml`) |

## Repository layout

```text
tpsreport-obsidian-sync/
├── main.js              # Obsidian plugin
├── manifest.json
├── skills/              # ← you are here
│   └── kb-metadata-enrichment/
│       ├── SKILL.md
│       ├── metadata-contract.yaml
│       ├── kb_lint.py
│       ├── KB_AGENT_PROMPT.md
│       └── README.md
└── docs/
```
